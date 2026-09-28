import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const SHIPPING_FLAT = 5;
export const DEFAULT_CARRIER = 'InPost';

const STORAGE_KEY = 'BRILHAH_STOCK_LOCAL_V2';
const TABLES = [
  'physical_stock_items','physical_stock_variants','physical_stock_sales','physical_stock_sale_lines',
  'physical_stock_reservations','physical_stock_reservation_lines','physical_stock_customers',
  'physical_stock_purchase_batches','physical_stock_purchase_lines','physical_stock_expenses',
  'physical_stock_movements','physical_stock_suppliers','physical_stock_settings','physical_stock_returns',
  'physical_stock_reorder_list','physical_stock_stocktakes','physical_stock_stocktake_lines'
];
const now=()=>new Date().toISOString();
const uid=()=>`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}-${Math.random().toString(36).slice(2,10)}`;
const initialDb=()=>{
  const t=now(); const db={_meta:{sale:0,reservation:0}};
  TABLES.forEach(x=>db[x]=[]);
  db.physical_stock_settings=[
    {id:'sales-market',key:'sales_market',value:'PT',notes:'Apenas Portugal; sem sincronização com Shopify.',created_at:t,updated_at:t},
    {id:'shipping-flat',key:'shipping_flat_rate_pt',value:'5.00',notes:'Portes fixos cobrados ao cliente em encomendas nacionais BRILHAH Stock.',created_at:t,updated_at:t},
    {id:'carrier-default',key:'default_carrier',value:'InPost',notes:'Transportadora nacional padrão.',created_at:t,updated_at:t}
  ];
  return db;
};
let cache=null;
const loadDb=async()=>{if(cache)return cache;try{const raw=await AsyncStorage.getItem(STORAGE_KEY);cache=raw?JSON.parse(raw):initialDb()}catch{cache=initialDb()}TABLES.forEach(x=>{if(!Array.isArray(cache[x]))cache[x]=[]});if(!cache._meta)cache._meta={sale:0,reservation:0};return cache};
const saveDb=async db=>{cache=db;await AsyncStorage.setItem(STORAGE_KEY,JSON.stringify(db));};
const itemById=(db,id)=>db.physical_stock_items.find(x=>x.id===id);
const variantById=(db,id)=>db.physical_stock_variants.find(x=>x.id===id);
const vCost=(db,v)=>{if(v?.purchase_cost!==null&&v?.purchase_cost!==undefined&&v?.purchase_cost!=='')return Number(v.purchase_cost||0);const i=itemById(db,v?.item_id);return Number(i?.landed_cost||0)>0?Number(i.landed_cost):Number(i?.purchase_cost||0)};
const vPrice=(db,v)=>{const i=itemById(db,v?.item_id);return Number(v?.sale_price??i?.sale_price??0)};
const availability=v=>Number(v?.quantity_on_hand||0)-Number(v?.quantity_reserved||0);
const movement=(db,variant_id,movement_type,quantity,extra={})=>db.physical_stock_movements.unshift({id:uid(),variant_id,movement_type,quantity,created_at:now(),...extra});

function withDefaults(table,row,db){
  const t=now(); const x={id:uid(),...row};
  if(table==='physical_stock_items')Object.assign(x,{purchase_cost:0,landed_cost:0,sale_price:0,tax_rate:23,reorder_point:1,status:'active',active:true,tags:[],image_urls:[],created_at:t,updated_at:t,...row});
  else if(table==='physical_stock_variants')Object.assign(x,{color:'Única',size:'Único',quantity_on_hand:0,quantity_reserved:0,active:true,created_at:t,updated_at:t,...row});
  else if(table==='physical_stock_sales'){db._meta.sale=(db._meta.sale||0)+1;Object.assign(x,{sale_number:db._meta.sale,channel:'facebook',status:'completed',payment_status:'paid',delivery_method:'shipping',shipping_country:'PT',shipping_fee:5,shipping_cost:0,subtotal:0,discount:0,total:0,sold_at:t,created_at:t,updated_at:t,order_status:'new',amount_paid:0,carrier:'InPost',packaging_cost:0,payment_fees:0,refund_total:0,invoice_status:'not_issued',...row});}
  else if(table==='physical_stock_reservations'){db._meta.reservation=(db._meta.reservation||0)+1;Object.assign(x,{reservation_number:db._meta.reservation,status:'active',shipping_fee:5,subtotal:0,total:0,created_at:t,updated_at:t,...row});}
  else if(table==='physical_stock_expenses')Object.assign(x,{expense_date:t.slice(0,10),created_at:t,updated_at:t,...row});
  else if(table==='physical_stock_purchase_batches')Object.assign(x,{purchase_date:t.slice(0,10),created_at:t,updated_at:t,...row});
  else if(table==='physical_stock_stocktakes')Object.assign(x,{status:'open',started_at:t,created_at:t,...row});
  else if(table==='physical_stock_returns')Object.assign(x,{quantity:1,item_condition:'resellable',resolution:'refund',refund_amount:0,restocked:false,created_at:t,...row});
  else if(table==='physical_stock_reorder_list')Object.assign(x,{desired_qty:1,priority:'normal',status:'open',created_at:t,updated_at:t,...row});
  else Object.assign(x,{created_at:t,updated_at:t,...row});
  return x;
}

class LocalQuery{
  constructor(table){this.table=table;this.action=null;this.payload=null;this.filters=[];this.orders=[];this.limitN=null;this.singleMode=false;this.returning=false;this.cols='*';}
  select(cols='*'){if(!this.action)this.action='select';else this.returning=true;this.cols=cols;return this;}
  insert(payload){this.action='insert';this.payload=payload;return this;}
  update(payload){this.action='update';this.payload=payload;return this;}
  eq(column,value){this.filters.push({column,value});return this;}
  order(column,{ascending=true}={}){this.orders.push({column,ascending});return this;}
  limit(n){this.limitN=Number(n);return this;}
  single(){this.singleMode=true;return this;}
  maybeSingle(){this.singleMode=true;return this;}
  then(resolve,reject){return this.exec().then(resolve,reject);}
  async exec(){
    try{
      const db=await loadDb(); if(!TABLES.includes(this.table))return {data:null,error:{message:'Tabela não permitida'}};
      let rows=db[this.table]; const match=r=>this.filters.every(f=>r?.[f.column]===f.value);
      if(this.action==='insert'){
        const src=Array.isArray(this.payload)?this.payload:[this.payload];const created=src.map(r=>withDefaults(this.table,r||{},db));rows.push(...created);await saveDb(db);const data=this.singleMode?created[0]:created;return {data,error:null};
      }
      if(this.action==='update'){
        const changed=[];for(let i=0;i<rows.length;i++)if(match(rows[i])){rows[i]={...rows[i],...this.payload,updated_at:now()};changed.push(rows[i])}await saveDb(db);const data=this.singleMode?(changed[0]||null):changed;return {data,error:null};
      }
      let out=rows.filter(match);
      for(const o of this.orders.slice().reverse())out=out.slice().sort((a,b)=>{const av=a?.[o.column],bv=b?.[o.column];if(av===bv)return 0;const c=av>bv?1:-1;return o.ascending?c:-c});
      if(Number.isFinite(this.limitN)&&this.limitN>=0)out=out.slice(0,this.limitN);
      return {data:this.singleMode?(out[0]||null):out,error:null};
    }catch(e){return {data:null,error:{message:String(e?.message||e)}}}
  }
}

async function rpc(name,args={}){
  try{
    const db=await loadDb(); const t=now();
    if(name==='physical_stock_add_units'){
      const v=variantById(db,args.p_variant_id),q=Number(args.p_quantity||0);if(!v)throw new Error('Variante não encontrada');if(q<=0)throw new Error('Quantidade inválida');v.quantity_on_hand=Number(v.quantity_on_hand||0)+q;v.updated_at=t;movement(db,v.id,'entry',q,{channel:args.p_channel||'stock_entry',notes:args.p_notes||'Entrada de stock'});await saveDb(db);return {data:v.quantity_on_hand,error:null};
    }
    if(name==='physical_stock_set_quantity'){
      const v=variantById(db,args.p_variant_id),n=Number(args.p_new_quantity);if(!v)throw new Error('Variante não encontrada');if(n<Number(v.quantity_reserved||0))throw new Error('Não pode ficar abaixo do stock reservado');const d=n-Number(v.quantity_on_hand||0);v.quantity_on_hand=n;v.updated_at=t;if(d)movement(db,v.id,'adjustment',d,{channel:'manual',notes:args.p_reason||'Ajuste manual'});await saveDb(db);return {data:n,error:null};
    }
    if(name==='physical_stock_create_order'){
      const lines=Array.isArray(args.p_lines)?args.p_lines:[];if(!lines.length)throw new Error('Encomenda sem artigos');let sub=0;const prepared=[];
      for(const l of lines){const v=variantById(db,l.variant_id),q=Math.max(1,Number(l.quantity||1));if(!v)throw new Error('Variante não encontrada');if(availability(v)<q)throw new Error('Stock disponível insuficiente');const p=Number(l.unit_price??vPrice(db,v));sub+=p*q;prepared.push({v,q,p});}
      const fee=Number(args.p_shipping_fee||0);const sale=withDefaults('physical_stock_sales',{customer_id:args.p_customer_id||null,customer_name:args.p_customer_name||null,channel:args.p_channel||'direto',payment_method:args.p_payment_method||null,payment_status:args.p_payment_status||'pending',delivery_method:args.p_delivery_method||'shipping',shipping_country:'PT',shipping_fee:fee,shipping_cost:Number(args.p_shipping_cost||0),subtotal:Number(sub.toFixed(2)),total:Number((sub+fee).toFixed(2)),amount_paid:Number(args.p_amount_paid||0),notes:args.p_notes||null,order_status:args.p_payment_status==='paid'?'paid':'awaiting_payment'},db);db.physical_stock_sales.unshift(sale);
      for(const {v,q,p} of prepared){const i=itemById(db,v.item_id);db.physical_stock_sale_lines.unshift(withDefaults('physical_stock_sale_lines',{sale_id:sale.id,variant_id:v.id,quantity:q,unit_price:p,unit_cost:vCost(db,v),line_total:Number((p*q).toFixed(2)),item_name:i?.name||'Produto',variant_color:v.color,variant_size:v.size,sku:v.sku||i?.sku||null},db));v.quantity_on_hand=Number(v.quantity_on_hand||0)-q;v.updated_at=t;movement(db,v.id,'sale',-q,{channel:args.p_channel||'direto',unit_sale_price:p,customer_name:args.p_customer_name||null,notes:args.p_notes||'Venda/encomenda'});}
      await saveDb(db);return {data:sale.id,error:null};
    }
    if(name==='physical_stock_create_reservation_cart'){
      const lines=Array.isArray(args.p_lines)?args.p_lines:[];if(!lines.length)throw new Error('Reserva sem artigos');let sub=0;const prepared=[];
      for(const l of lines){const v=variantById(db,l.variant_id),q=Math.max(1,Number(l.quantity||1));if(!v)throw new Error('Variante não encontrada');if(availability(v)<q)throw new Error('Stock disponível insuficiente');sub+=vPrice(db,v)*q;prepared.push({v,q});}
      const res=withDefaults('physical_stock_reservations',{customer_id:args.p_customer_id||null,customer_name:args.p_customer_name||null,channel:args.p_channel||'direto',status:'active',expires_at:args.p_expires_at||new Date(Date.now()+86400000).toISOString(),notes:args.p_notes||null,shipping_fee:5,subtotal:Number(sub.toFixed(2)),total:Number((sub+5).toFixed(2))},db);db.physical_stock_reservations.unshift(res);
      for(const {v,q} of prepared){db.physical_stock_reservation_lines.unshift(withDefaults('physical_stock_reservation_lines',{reservation_id:res.id,variant_id:v.id,quantity:q},db));v.quantity_reserved=Number(v.quantity_reserved||0)+q;v.updated_at=t;movement(db,v.id,'reserve',q,{channel:args.p_channel||'direto',customer_name:args.p_customer_name||null,notes:'Reserva criada'});}
      await saveDb(db);return {data:res.id,error:null};
    }
    if(name==='physical_stock_create_reservation')return rpc('physical_stock_create_reservation_cart',{p_customer_name:args.p_customer_name,p_channel:args.p_channel,p_expires_at:args.p_expires_at,p_notes:args.p_notes,p_lines:[{variant_id:args.p_variant_id,quantity:args.p_quantity||1}]});
    if(name==='physical_stock_reservation_add_line'){
      const res=db.physical_stock_reservations.find(x=>x.id===args.p_reservation_id&&x.status==='active');const v=variantById(db,args.p_variant_id),q=Math.max(1,Number(args.p_quantity||1));if(!res)throw new Error('Reserva não encontrada');if(!v||availability(v)<q)throw new Error('Stock disponível insuficiente');let line=db.physical_stock_reservation_lines.find(x=>x.reservation_id===res.id&&x.variant_id===v.id);if(line)line.quantity=Number(line.quantity||0)+q;else{line=withDefaults('physical_stock_reservation_lines',{reservation_id:res.id,variant_id:v.id,quantity:q},db);db.physical_stock_reservation_lines.unshift(line)}v.quantity_reserved=Number(v.quantity_reserved||0)+q;movement(db,v.id,'reserve',q,{channel:res.channel||'direto',customer_name:res.customer_name||null,notes:'Artigo adicionado à reserva'});const rls=db.physical_stock_reservation_lines.filter(x=>x.reservation_id===res.id);res.subtotal=rls.reduce((a,l)=>{const vv=variantById(db,l.variant_id);return a+vPrice(db,vv)*Number(l.quantity||0)},0);res.total=Number(res.subtotal)+5;res.updated_at=t;await saveDb(db);return {data:true,error:null};
    }
    if(name==='physical_stock_close_reservation'){
      const res=db.physical_stock_reservations.find(x=>x.id===args.p_reservation_id&&x.status==='active');if(!res)throw new Error('Reserva não encontrada ou inativa');for(const l of db.physical_stock_reservation_lines.filter(x=>x.reservation_id===res.id)){const v=variantById(db,l.variant_id);if(v){v.quantity_reserved=Math.max(0,Number(v.quantity_reserved||0)-Number(l.quantity||0));movement(db,v.id,'reservation_release',-Number(l.quantity||0),{channel:'reservation',notes:`Reserva encerrada: ${args.p_status||'cancelled'}`})}}res.status=args.p_status||'cancelled';res.updated_at=t;await saveDb(db);return {data:true,error:null};
    }
    if(name==='physical_stock_convert_reservation'){
      const res=db.physical_stock_reservations.find(x=>x.id===args.p_reservation_id&&x.status==='active');if(!res)throw new Error('Reserva não encontrada ou inativa');const lines=db.physical_stock_reservation_lines.filter(x=>x.reservation_id===res.id);let sub=0;for(const l of lines){const v=variantById(db,l.variant_id);if(!v||Number(v.quantity_on_hand||0)<Number(l.quantity||0)||Number(v.quantity_reserved||0)<Number(l.quantity||0))throw new Error('Stock reservado inconsistente');sub+=vPrice(db,v)*Number(l.quantity||0)}const fee=(args.p_delivery_method||'shipping')==='shipping'?5:0;const sale=withDefaults('physical_stock_sales',{customer_id:res.customer_id||null,customer_name:res.customer_name||null,channel:res.channel||'direto',payment_method:args.p_payment_method||null,payment_status:args.p_payment_status||'pending',delivery_method:args.p_delivery_method||'shipping',shipping_fee:fee,shipping_cost:Number(args.p_shipping_cost||0),subtotal:Number(sub.toFixed(2)),total:Number((sub+fee).toFixed(2)),amount_paid:Number(args.p_amount_paid||0),notes:args.p_notes||null,order_status:(args.p_payment_status==='paid'?'paid':'awaiting_payment')},db);db.physical_stock_sales.unshift(sale);for(const l of lines){const v=variantById(db,l.variant_id),i=itemById(db,v.item_id),q=Number(l.quantity||0),p=vPrice(db,v);db.physical_stock_sale_lines.unshift(withDefaults('physical_stock_sale_lines',{sale_id:sale.id,variant_id:v.id,quantity:q,unit_price:p,unit_cost:vCost(db,v),line_total:p*q,item_name:i?.name||'Produto',variant_color:v.color,variant_size:v.size,sku:v.sku||i?.sku||null},db));v.quantity_on_hand=Number(v.quantity_on_hand||0)-q;v.quantity_reserved=Math.max(0,Number(v.quantity_reserved||0)-q);movement(db,v.id,'sale',-q,{channel:res.channel||'direto',unit_sale_price:p,customer_name:res.customer_name||null,notes:'Reserva convertida em venda'});}res.status='converted';res.converted_sale_id=sale.id;res.updated_at=t;await saveDb(db);return {data:sale.id,error:null};
    }
    if(name==='physical_stock_register_return'){
      const sale=db.physical_stock_sales.find(x=>x.id===args.p_sale_id);const line=db.physical_stock_sale_lines.find(x=>x.id===args.p_sale_line_id&&x.sale_id===args.p_sale_id);const q=Math.max(1,Number(args.p_quantity||1));if(!sale||!line)throw new Error('Venda ou artigo não encontrado');const already=db.physical_stock_returns.filter(x=>x.sale_line_id===line.id).reduce((a,x)=>a+Number(x.quantity||0),0);if(already+q>Number(line.quantity||0))throw new Error('Quantidade devolvida superior à vendida');const ret=withDefaults('physical_stock_returns',{sale_id:sale.id,sale_line_id:line.id,variant_id:args.p_variant_id||line.variant_id,quantity:q,reason:args.p_reason||null,item_condition:args.p_item_condition||'resellable',resolution:args.p_resolution||'refund',refund_amount:Number(args.p_refund_amount||0),restocked:!!args.p_restock,notes:args.p_notes||null,resolved_at:t},db);db.physical_stock_returns.unshift(ret);sale.refund_total=Number(sale.refund_total||0)+Number(ret.refund_amount||0);if(ret.refund_amount>0)sale.status='refunded';sale.updated_at=t;if(ret.restocked){const v=variantById(db,ret.variant_id);if(v){v.quantity_on_hand=Number(v.quantity_on_hand||0)+q;movement(db,v.id,'return',q,{channel:'return',notes:ret.reason||'Devolução'})}}await saveDb(db);return {data:ret.id,error:null};
    }
    if(name==='physical_stock_record_sale'){
      const r=await rpc('physical_stock_create_order',{p_customer_name:args.p_customer_name,p_channel:args.p_channel,p_payment_method:args.p_payment_method,p_payment_status:'paid',p_delivery_method:args.p_delivery_method,p_shipping_fee:args.p_shipping_fee,p_shipping_cost:args.p_shipping_cost,p_amount_paid:0,p_notes:args.p_notes,p_lines:[{variant_id:args.p_variant_id,quantity:args.p_quantity||1,unit_price:args.p_unit_price||0}]});return r;
    }
    throw new Error('Operação local não implementada');
  }catch(e){return {data:null,error:{message:String(e?.message||e)}}}
}

export const supabase={from:table=>new LocalQuery(table),rpc,auth:{getSession:async()=>({data:{session:{local:true}},error:null}),signOut:async()=>({error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}};

export const MENU = [
  ['dashboard','⌂','Dashboard'],['produtos','◇','Produtos'],['stock','▦','Stock / Variantes'],
  ['vendas','€','Vendas / Encomendas'],['reservas','◷','Reservas / Diretos'],['clientes','♙','Clientes'],
  ['compras','↓','Compras / Entradas'],['fornecedores','◈','Fornecedores'],['reposicao','↥','Reposição'],
  ['inventario','✓','Inventário físico'],['devolucoes','↩','Devoluções'],['envios','➜','Envios'],
  ['despesas','−','Despesas'],['estatisticas','▥','Estatísticas'],['historico','↺','Histórico'],['definicoes','⚙','Definições'],
];
export const CHANNELS = ['direto','facebook','instagram','tiktok','whatsapp','presencial','outro'];
export const PAYMENTS = ['MB Way','Dinheiro','Transferência','PayPal','Outro'];
export const ORDER_STATUS = [['new','Nova'],['awaiting_payment','A aguardar pagamento'],['paid','Paga'],['preparing','A preparar'],['ready','Pronta'],['shipped','Enviada'],['delivered','Entregue'],['cancelled','Cancelada'],['returned','Devolvida']];
export const money = v => `${Number(v || 0).toFixed(2).replace('.', ',')} €`;
export const available = v => Number(v?.quantity_on_hand || 0) - Number(v?.quantity_reserved || 0);
export const unitCost = v => {const c=v?.purchase_cost;if(c!==null&&c!==undefined&&c!=='')return Number(c||0);const l=Number(v?.item?.landed_cost||0);return l>0?l:Number(v?.item?.purchase_cost||0)};
export const unitPrice = v => Number(v?.sale_price ?? v?.item?.sale_price ?? 0);
export const date = v => { try { return v ? new Date(v).toLocaleDateString('pt-PT') : '—'; } catch { return '—'; } };
export const datetime = v => { try { return v ? new Date(v).toLocaleString('pt-PT',{dateStyle:'short',timeStyle:'short'}) : '—'; } catch { return '—'; } };
export const cleanList = s => String(s||'').split(',').map(x=>x.trim()).filter(Boolean);
export const saleStatusLabel = status => ORDER_STATUS.find(x=>x[0]===status)?.[1] || status || 'Nova';

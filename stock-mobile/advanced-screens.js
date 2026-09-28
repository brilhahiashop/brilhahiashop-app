import React, { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { Button, Card, Empty, Pill, Section } from './components';
import { datetime, money, saleStatusLabel, supabase } from './lib';
import s from './styles';

export function SalesPro({sales,saleLines,onNew,onShipping,onReturn,onRefresh}){
  const [filter,setFilter]=useState('open');
  const rows=sales.filter(x=>filter==='all'||(filter==='open'?!['delivered','cancelled','returned'].includes(x.order_status):x.order_status===filter));

  const paid=async sale=>{
    const {error}=await supabase.from('physical_stock_sales').update({payment_status:'paid',amount_paid:sale.total,order_status:sale.order_status==='awaiting_payment'?'paid':sale.order_status,updated_at:new Date().toISOString()}).eq('id',sale.id);
    if(error)Alert.alert('Erro',error.message);else onRefresh();
  };

  const nextStatus=async(sale,status)=>{
    const payload={order_status:status,updated_at:new Date().toISOString()};
    if(status==='shipped')payload.shipped_at=sale.shipped_at||new Date().toISOString();
    if(status==='delivered')payload.delivered_at=sale.delivered_at||new Date().toISOString();
    const {error}=await supabase.from('physical_stock_sales').update(payload).eq('id',sale.id);
    if(error)Alert.alert('Erro',error.message);else onRefresh();
  };

  const cancel=sale=>Alert.alert(
    'Cancelar encomenda',
    sale.payment_status==='paid'?'O stock volta automaticamente ao disponível. Esta encomenda está paga: confirma depois o reembolso ao cliente.':'O stock das peças volta automaticamente ao disponível.',
    [
      {text:'Voltar',style:'cancel'},
      {text:'Cancelar encomenda',style:'destructive',onPress:async()=>{
        const {error}=await supabase.rpc('physical_stock_cancel_order',{p_sale_id:sale.id,p_reason:'Cancelada na app BRILHAH Stock'});
        if(error)Alert.alert('Erro',error.message);else{Alert.alert('Encomenda cancelada','O stock foi reposto automaticamente.');onRefresh();}
      }}
    ]
  );

  return <View>
    <Section title="Vendas / Encomendas" subtitle={`${sales.length} registadas`} action="+ Nova" onAction={onNew}/>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:8}}>
      {[['open','Em curso'],['all','Todas'],['awaiting_payment','Aguardam pagamento'],['preparing','A preparar'],['ready','Prontas'],['shipped','Enviadas'],['delivered','Entregues'],['cancelled','Canceladas']].map(([v,l])=><Pill key={v} active={filter===v} onPress={()=>setFilter(v)}>{l}</Pill>)}
    </ScrollView>
    {rows.length===0?<Empty text="Sem encomendas neste filtro."/>:rows.map(x=>{
      const lines=saleLines.filter(l=>l.sale_id===x.id);
      const cogs=lines.reduce((a,l)=>a+Number(l.unit_cost||0)*Number(l.quantity||0),0);
      const profit=Number(x.subtotal||0)-cogs+Number(x.shipping_fee||0)-Number(x.shipping_cost||0)-Number(x.packaging_cost||0)-Number(x.payment_fees||0)-Number(x.refund_total||0);
      const canCancel=!['shipped','delivered','cancelled','returned'].includes(x.order_status);
      return <Card key={x.id}>
        <View style={s.between}><View style={{flex:1}}><Text style={s.listTitle}>#{x.sale_number} · {x.customer_name||'Cliente'}</Text><Text style={s.listSub}>{datetime(x.sold_at)} · {x.channel} · {saleStatusLabel(x.order_status)}</Text></View><Text style={s.money}>{money(x.total)}</Text></View>
        <Text style={s.detail}>{lines.map(l=>`${l.quantity}× ${l.item_name||'Artigo'} ${l.variant_color||''} ${l.variant_size||''}`).join(' · ')||'Sem linhas'}</Text>
        <View style={[s.chips,{marginTop:7}]}><Pill>{x.payment_status}</Pill><Pill>{x.delivery_method==='shipping'?'Envio PT':'Entrega/levantamento'}</Pill><Pill>Portes {money(x.shipping_fee)}</Pill><Pill>Lucro est. {money(profit)}</Pill></View>
        {x.shipping_address1&&<Text style={s.detail}>{x.shipping_address1}{x.shipping_address2?`, ${x.shipping_address2}`:''} · {x.shipping_postal_code||''} {x.shipping_city||''}</Text>}
        {x.tracking_code&&<Text style={s.detail}>Tracking: {x.tracking_code}</Text>}
        <View style={s.actions}>
          {x.payment_status!=='paid'&&x.order_status!=='cancelled'&&<Button small ghost onPress={()=>paid(x)}>Marcar pago</Button>}
          {['new','paid','awaiting_payment'].includes(x.order_status)&&<Button small ghost onPress={()=>nextStatus(x,'preparing')}>Preparar</Button>}
          {x.order_status==='preparing'&&<Button small ghost onPress={()=>nextStatus(x,'ready')}>Pronta</Button>}
          {x.delivery_method==='shipping'&&!['delivered','cancelled','returned'].includes(x.order_status)&&<Button small ghost onPress={()=>onShipping(x)}>Envio</Button>}
          {!['cancelled','returned'].includes(x.order_status)&&<Button small ghost onPress={()=>onReturn(x)}>Devolução</Button>}
          {canCancel&&<Button small danger onPress={()=>cancel(x)}>Cancelar</Button>}
        </View>
      </Card>;
    })}
  </View>;
}

export function ReservationsPro({reservations,lines,variantById,itemById,onRefresh,onNew}){
  const [filter,setFilter]=useState('active');
  const rows=reservations.filter(r=>filter==='all'||r.status===filter);

  const close=async(id,status)=>{
    const {error}=await supabase.rpc('physical_stock_close_reservation',{p_reservation_id:id,p_status:status});
    if(error)Alert.alert('Erro',error.message);else onRefresh();
  };

  const convert=async(r,delivery)=>{
    const shipping=delivery==='shipping';
    const {error}=await supabase.rpc('physical_stock_convert_reservation',{
      p_reservation_id:r.id,
      p_payment_method:'MB Way',
      p_payment_status:'pending',
      p_delivery_method:delivery,
      p_shipping_cost:0,
      p_amount_paid:0,
      p_notes:shipping?'Reserva convertida em encomenda para envio':'Reserva convertida em venda com entrega/levantamento'
    });
    if(error)Alert.alert('Erro',error.message);else{Alert.alert('Reserva convertida',shipping?'Criada encomenda com 5 € de portes.':'Criada venda sem portes.');onRefresh();}
  };

  const chooseConvert=r=>Alert.alert('Converter reserva','Como vai ser entregue ao cliente?',[
    {text:'Voltar',style:'cancel'},
    {text:'Entrega / levantamento',onPress:()=>convert(r,'pickup')},
    {text:'Envio · 5 €',onPress:()=>convert(r,'shipping')}
  ]);

  return <View>
    <Section title="Reservas / Diretos" subtitle={`${reservations.filter(x=>x.status==='active').length} ativas`} action="+ Reserva" onAction={onNew}/>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:8}}>
      {[['active','Ativas'],['all','Todas'],['converted','Convertidas'],['expired','Expiradas'],['cancelled','Canceladas']].map(([v,l])=><Pill key={v} active={filter===v} onPress={()=>setFilter(v)}>{l}</Pill>)}
    </ScrollView>
    {rows.length===0?<Empty text="Sem reservas neste filtro."/>:rows.map(r=>{
      const rl=lines.filter(l=>l.reservation_id===r.id);
      return <Card key={r.id}>
        <View style={s.between}><View style={{flex:1}}><Text style={s.listTitle}>Reserva #{r.reservation_number||'—'} · {r.customer_name||'Cliente'}</Text><Text style={s.listSub}>{r.channel} · {datetime(r.created_at)}{r.expires_at?` · válida até ${datetime(r.expires_at)}`:''}</Text></View><Pill active={r.status==='active'}>{r.status}</Pill></View>
        {rl.map(l=>{const v=variantById[l.variant_id],i=v?itemById[v.item_id]:null;return <Text key={l.id} style={s.detail}>• {l.quantity} × {i?.name||'Produto'} · {v?.color} · {v?.size}</Text>})}
        <View style={[s.between,{marginTop:8}]}><Text style={s.detail}>Produtos</Text><Text style={s.money}>{money(r.subtotal)}</Text></View>
        <View style={s.between}><Text style={s.detail}>Total previsto com envio</Text><Text style={s.money}>{money(r.total)}</Text></View>
        {r.status==='active'&&<View style={s.actions}><Button small danger onPress={()=>close(r.id,'cancelled')}>Cancelar</Button><Button small ghost onPress={()=>close(r.id,'expired')}>Expirar</Button><Button small onPress={()=>chooseConvert(r)}>Converter em venda</Button></View>}
        {r.converted_sale_id&&<Text style={s.help}>Convertida para venda/encomenda.</Text>}
      </Card>;
    })}
  </View>;
}

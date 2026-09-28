import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, SafeAreaView, ScrollView, StatusBar, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Drawer, Button } from './components';
import { ADMIN_EMAIL, MENU, SUPABASE_KEY, SUPABASE_URL, supabase, unitCost, unitPrice } from './lib';
import { Dashboard, Products, Inventory, Sales, Reservations, Customers, Purchases, Suppliers, Reorder, Stocktake, Returns, Expenses, Shipping, Stats, History, Settings } from './screens';
import { ProductModal, VariantModal, OrderModal, ReservationCartModal, CustomerModal, ExpenseModal, PurchaseModal, SupplierModal, ShippingModal, ReturnModal, AdjustStockModal } from './modals';
import s from './styles';

function Login({onReady}){
  const [code,setCode]=useState(''),[busy,setBusy]=useState(false),[msg,setMsg]=useState('');
  const login=async()=>{const clean=code.replace(/\D/g,'').slice(0,6);if(clean.length!==6)return setMsg('Introduz os 6 dígitos do Authenticator.');setBusy(true);setMsg('A validar…');try{await supabase.auth.signOut().catch(()=>{});const r=await fetch(`${SUPABASE_URL}/functions/v1/brilhah-bootstrap-login`,{method:'POST',headers:{apikey:SUPABASE_KEY,'Content-Type':'application/json'},body:JSON.stringify({email:ADMIN_EMAIL})});const p=await r.json().catch(()=>({}));if(!r.ok||!p.token_hash)throw new Error('Não foi possível iniciar a sessão BRILHAH.');const first=await supabase.auth.verifyOtp({token_hash:p.token_hash,type:'email'});if(first.error)throw first.error;const fs=await supabase.auth.mfa.listFactors();if(fs.error)throw fs.error;const factor=(fs.data?.totp||[]).find(x=>x.status==='verified');if(!factor)throw new Error('Authenticator BRILHAH não encontrado.');const ch=await supabase.auth.mfa.challenge({factorId:factor.id});if(ch.error)throw ch.error;const vr=await supabase.auth.mfa.verify({factorId:factor.id,challengeId:ch.data.id,code:clean});if(vr.error)throw vr.error;const aal=await supabase.auth.mfa.getAuthenticatorAssuranceLevel();if(aal.error||aal.data?.currentLevel!=='aal2')throw new Error('MFA não confirmado.');const ss=await supabase.auth.getSession();if(!ss.data?.session)throw new Error('Sessão inválida.');onReady(ss.data.session)}catch(e){setMsg(/invalid|totp|challenge|expired/i.test(String(e?.message||e))?'Código inválido ou expirado.':String(e?.message||e))}finally{setBusy(false)}};
  return <SafeAreaView style={s.login}><StatusBar barStyle="light-content" backgroundColor="#0b1423"/><View style={s.loginCard}><Text style={s.brand}>BRILHAH</Text><Text style={s.loginTitle}>Stock</Text><Text style={s.loginSub}>Gestão interna de stock físico · Portugal</Text><Text style={s.label}>Código do Authenticator</Text><TextInput value={code} onChangeText={v=>setCode(v.replace(/\D/g,'').slice(0,6))} keyboardType="number-pad" maxLength={6} placeholder="000000" placeholderTextColor="#6d7a8f" style={[s.input,{textAlign:'center',fontSize:24,letterSpacing:9,marginBottom:12}]}/><Button disabled={busy} onPress={login}>{busy?'A validar…':'Entrar'}</Button>{!!msg&&<Text style={s.loginMsg}>{msg}</Text>}</View></SafeAreaView>;
}

const initialData={items:[],variants:[],sales:[],saleLines:[],reservations:[],reservationLines:[],customers:[],purchases:[],purchaseLines:[],expenses:[],movements:[],suppliers:[],settings:[],returns:[],reorder:[],stocktakes:[],stocktakeLines:[]};

function Shell({onLogout}){
  const [screen,setScreen]=useState('dashboard'),[drawer,setDrawer]=useState(false),[loading,setLoading]=useState(true),[refreshing,setRefreshing]=useState(false),[data,setData]=useState(initialData);
  const [productOpen,setProductOpen]=useState(false),[editItem,setEditItem]=useState(null),[variantItem,setVariantItem]=useState(null),[orderOpen,setOrderOpen]=useState(false),[reserveOpen,setReserveOpen]=useState(false),[customerOpen,setCustomerOpen]=useState(false),[expenseOpen,setExpenseOpen]=useState(false),[purchaseOpen,setPurchaseOpen]=useState(false),[supplierOpen,setSupplierOpen]=useState(false),[shippingSale,setShippingSale]=useState(null),[returnSale,setReturnSale]=useState(null),[adjustVariant,setAdjustVariant]=useState(null);

  const load=useCallback(async(soft=false)=>{if(!soft)setLoading(true);try{
    const qs=await Promise.all([
      supabase.from('physical_stock_items').select('*').order('created_at',{ascending:false}),
      supabase.from('physical_stock_variants').select('*').order('created_at',{ascending:false}),
      supabase.from('physical_stock_sales').select('*').order('sold_at',{ascending:false}).limit(500),
      supabase.from('physical_stock_sale_lines').select('*').order('created_at',{ascending:false}).limit(1500),
      supabase.from('physical_stock_reservations').select('*').order('created_at',{ascending:false}).limit(500),
      supabase.from('physical_stock_reservation_lines').select('*').order('created_at',{ascending:false}).limit(1500),
      supabase.from('physical_stock_customers').select('*').order('created_at',{ascending:false}).limit(1000),
      supabase.from('physical_stock_purchase_batches').select('*').order('purchase_date',{ascending:false}).limit(500),
      supabase.from('physical_stock_purchase_lines').select('*').order('created_at',{ascending:false}).limit(1500),
      supabase.from('physical_stock_expenses').select('*').order('expense_date',{ascending:false}).limit(1000),
      supabase.from('physical_stock_movements').select('*').order('created_at',{ascending:false}).limit(2000),
      supabase.from('physical_stock_suppliers').select('*').order('name'),
      supabase.from('physical_stock_settings').select('*'),
      supabase.from('physical_stock_returns').select('*').order('created_at',{ascending:false}).limit(500),
      supabase.from('physical_stock_reorder_list').select('*').order('created_at',{ascending:false}).limit(500),
      supabase.from('physical_stock_stocktakes').select('*').order('started_at',{ascending:false}).limit(100),
      supabase.from('physical_stock_stocktake_lines').select('*').limit(2000),
    ]);
    const err=qs.find(x=>x.error)?.error;if(err)throw err;
    setData({items:qs[0].data||[],variants:qs[1].data||[],sales:qs[2].data||[],saleLines:qs[3].data||[],reservations:qs[4].data||[],reservationLines:qs[5].data||[],customers:qs[6].data||[],purchases:qs[7].data||[],purchaseLines:qs[8].data||[],expenses:qs[9].data||[],movements:qs[10].data||[],suppliers:qs[11].data||[],settings:qs[12].data||[],returns:qs[13].data||[],reorder:qs[14].data||[],stocktakes:qs[15].data||[],stocktakeLines:qs[16].data||[]});
  }catch(e){console.warn('BRILHAH Stock load',e)}finally{setLoading(false);setRefreshing(false)}},[]);
  useEffect(()=>{load()},[load]);

  const itemById=useMemo(()=>Object.fromEntries(data.items.map(x=>[x.id,x])),[data.items]);
  const variantById=useMemo(()=>Object.fromEntries(data.variants.map(x=>[x.id,x])),[data.variants]);
  const variants=useMemo(()=>data.variants.map(v=>({...v,item:itemById[v.item_id]})).filter(v=>v.item),[data.variants,itemById]);
  const metrics=useMemo(()=>{
    const pieces=variants.reduce((a,v)=>a+Number(v.quantity_on_hand||0),0),reserved=variants.reduce((a,v)=>a+Number(v.quantity_reserved||0),0),stockCost=variants.reduce((a,v)=>a+Number(v.quantity_on_hand||0)*unitCost(v),0),stockPotential=variants.reduce((a,v)=>a+Number(v.quantity_on_hand||0)*unitPrice(v),0);
    const today=new Date().toISOString().slice(0,10),month=today.slice(0,7);const valid=data.sales.filter(x=>x.order_status!=='cancelled');const st=valid.filter(x=>String(x.sold_at||'').slice(0,10)===today),sm=valid.filter(x=>String(x.sold_at||'').slice(0,7)===month);const ids=new Set(sm.map(x=>x.id));
    const revenueToday=st.reduce((a,x)=>a+Number(x.total||0),0),revenueMonth=sm.reduce((a,x)=>a+Number(x.total||0),0),shippingChargedMonth=sm.reduce((a,x)=>a+Number(x.shipping_fee||0),0),shippingCostMonth=sm.reduce((a,x)=>a+Number(x.shipping_cost||0),0),packagingMonth=sm.reduce((a,x)=>a+Number(x.packaging_cost||0),0),feesMonth=sm.reduce((a,x)=>a+Number(x.payment_fees||0),0),refundsMonth=sm.reduce((a,x)=>a+Number(x.refund_total||0),0),cogs=data.saleLines.filter(x=>ids.has(x.sale_id)).reduce((a,x)=>a+Number(x.unit_cost||0)*Number(x.quantity||0),0),expensesMonth=data.expenses.filter(x=>String(x.expense_date||'').slice(0,7)===month).reduce((a,x)=>a+Number(x.amount||0),0),productRevenue=sm.reduce((a,x)=>a+Number(x.subtotal||0),0);
    return {pieces,reserved,available:pieces-reserved,stockCost,stockPotential,salesToday:st.length,revenueToday,revenueMonth,shippingChargedMonth,shippingCostMonth,cogs,expensesMonth,estimatedProfit:productRevenue-cogs+shippingChargedMonth-shippingCostMonth-packagingMonth-feesMonth-refundsMonth-expensesMonth};
  },[data,variants]);

  if(loading)return <SafeAreaView style={s.loading}><ActivityIndicator color="#d7b56d" size="large"/><Text style={{color:'#9aabc0'}}>A carregar BRILHAH Stock…</Text></SafeAreaView>;
  const choose=id=>{setScreen(id);setDrawer(false)};const title=MENU.find(x=>x[0]===screen)?.[2]||'BRILHAH Stock';const saved=close=>()=>{close();load(true)};
  const openNewProduct=()=>{setEditItem(null);setProductOpen(true)};const openEdit=item=>{setEditItem(item);setProductOpen(true)};

  let body=null;
  if(screen==='dashboard')body=<Dashboard data={data} metrics={metrics} variants={variants} onNewOrder={()=>setOrderOpen(true)} onNewReserve={()=>setReserveOpen(true)}/>;
  if(screen==='produtos')body=<Products items={data.items} variants={variants} onAdd={openNewProduct} onEdit={openEdit} onVariant={setVariantItem} onRefresh={()=>load(true)}/>;
  if(screen==='stock')body=<Inventory variants={variants} onAdjust={setAdjustVariant} onRefresh={()=>load(true)}/>;
  if(screen==='vendas')body=<Sales sales={data.sales} saleLines={data.saleLines} onNew={()=>setOrderOpen(true)} onShipping={setShippingSale} onReturn={setReturnSale} onRefresh={()=>load(true)}/>;
  if(screen==='reservas')body=<Reservations reservations={data.reservations} lines={data.reservationLines} variantById={variantById} itemById={itemById} onRefresh={()=>load(true)}/>;
  if(screen==='clientes')body=<Customers rows={data.customers} sales={data.sales} onAdd={()=>setCustomerOpen(true)}/>;
  if(screen==='compras')body=<Purchases rows={data.purchases} purchaseLines={data.purchaseLines} onAdd={()=>setPurchaseOpen(true)}/>;
  if(screen==='fornecedores')body=<Suppliers rows={data.suppliers} items={data.items} purchases={data.purchases} onAdd={()=>setSupplierOpen(true)}/>;
  if(screen==='reposicao')body=<Reorder rows={data.reorder} variants={variants} onRefresh={()=>load(true)}/>;
  if(screen==='inventario')body=<Stocktake variants={variants} onAdjust={setAdjustVariant}/>;
  if(screen==='devolucoes')body=<Returns returns={data.returns} sales={data.sales}/>;
  if(screen==='envios')body=<Shipping sales={data.sales} onEdit={setShippingSale}/>;
  if(screen==='despesas')body=<Expenses rows={data.expenses} onAdd={()=>setExpenseOpen(true)}/>;
  if(screen==='estatisticas')body=<Stats data={data} metrics={metrics} variants={variants}/>;
  if(screen==='historico')body=<History movements={data.movements} variantById={variantById} itemById={itemById}/>;
  if(screen==='definicoes')body=<Settings settings={data.settings} onLogout={onLogout}/>;

  const pendingShip=data.sales.filter(x=>x.delivery_method==='shipping'&&!['shipped','delivered','cancelled','returned'].includes(x.order_status)).length;
  return <SafeAreaView style={s.page}><StatusBar barStyle="light-content" backgroundColor="#0b1423"/><View style={s.topbar}><TouchableOpacity style={s.menuBtn} onPress={()=>setDrawer(true)}><Text style={s.menuTxt}>☰</Text></TouchableOpacity><View style={{flex:1}}><Text style={s.topTitle}>{title}</Text><Text style={s.topSub}>Stock físico · Portugal · 5 € portes</Text></View><TouchableOpacity style={s.refresh} onPress={()=>load(true)}><Text style={s.refreshTxt}>↻</Text></TouchableOpacity></View><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true);load(true)}} tintColor="#d7b56d"/>}>{body}</ScrollView>
    <Drawer open={drawer} active={screen} onClose={()=>setDrawer(false)} onChoose={choose} counts={{stock:metrics.available,reservas:data.reservations.filter(x=>x.status==='active').length,envios:pendingShip}}/>
    <ProductModal visible={productOpen} item={editItem} suppliers={data.suppliers} onClose={()=>setProductOpen(false)} onSaved={saved(()=>setProductOpen(false))}/>
    <VariantModal item={variantItem} onClose={()=>setVariantItem(null)} onSaved={saved(()=>setVariantItem(null))}/>
    <OrderModal visible={orderOpen} variants={variants} customers={data.customers} onClose={()=>setOrderOpen(false)} onSaved={saved(()=>setOrderOpen(false))}/>
    <ReservationCartModal visible={reserveOpen} variants={variants} customers={data.customers} onClose={()=>setReserveOpen(false)} onSaved={saved(()=>setReserveOpen(false))}/>
    <CustomerModal visible={customerOpen} onClose={()=>setCustomerOpen(false)} onSaved={saved(()=>setCustomerOpen(false))}/>
    <ExpenseModal visible={expenseOpen} onClose={()=>setExpenseOpen(false)} onSaved={saved(()=>setExpenseOpen(false))}/>
    <PurchaseModal visible={purchaseOpen} suppliers={data.suppliers} onClose={()=>setPurchaseOpen(false)} onSaved={saved(()=>setPurchaseOpen(false))}/>
    <SupplierModal visible={supplierOpen} onClose={()=>setSupplierOpen(false)} onSaved={saved(()=>setSupplierOpen(false))}/>
    <ShippingModal sale={shippingSale} onClose={()=>setShippingSale(null)} onSaved={saved(()=>setShippingSale(null))}/>
    <ReturnModal sale={returnSale} lines={data.saleLines} onClose={()=>setReturnSale(null)} onSaved={saved(()=>setReturnSale(null))}/>
    <AdjustStockModal variant={adjustVariant} onClose={()=>setAdjustVariant(null)} onSaved={saved(()=>setAdjustVariant(null))}/>
  </SafeAreaView>;
}

export default function App(){const [session,setSession]=useState(null),[checked,setChecked]=useState(false);useEffect(()=>{supabase.auth.getSession().then(({data})=>{setSession(data.session||null);setChecked(true)});const {data:l}=supabase.auth.onAuthStateChange((_e,next)=>setSession(next));return()=>l.subscription.unsubscribe()},[]);const logout=async()=>{await supabase.auth.signOut();setSession(null)};if(!checked)return <SafeAreaView style={s.loading}><ActivityIndicator color="#d7b56d" size="large"/></SafeAreaView>;if(!session)return <Login onReady={setSession}/>;return <Shell onLogout={logout}/>}

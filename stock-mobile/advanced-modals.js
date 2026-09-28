import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, View } from 'react-native';
import { BaseModal, Button, Card, Divider, Field, Pill, Section } from './components';
import { money, supabase } from './lib';
import s from './styles';

const num=v=>Number(String(v??'').replace(',','.'))||0;

export function PurchaseReceiveModal({visible,variants=[],suppliers=[],onClose,onSaved}){
  const [supplierId,setSupplierId]=useState(null);
  const [supplierName,setSupplierName]=useState('');
  const [invoice,setInvoice]=useState('');
  const [shipping,setShipping]=useState('0');
  const [taxes,setTaxes]=useState('0');
  const [payment,setPayment]=useState('');
  const [documentUrl,setDocumentUrl]=useState('');
  const [notes,setNotes]=useState('');
  const [query,setQuery]=useState('');
  const [cart,setCart]=useState({});
  const [busy,setBusy]=useState(false);

  useEffect(()=>{if(visible){setSupplierId(null);setSupplierName('');setInvoice('');setShipping('0');setTaxes('0');setPayment('');setDocumentUrl('');setNotes('');setQuery('');setCart({});}},[visible]);

  const filtered=useMemo(()=>variants.filter(v=>{
    const z=query.trim().toLowerCase();
    if(!z)return true;
    return `${v.item?.name||''} ${v.item?.supplier||''} ${v.color||''} ${v.size||''} ${v.sku||''}`.toLowerCase().includes(z);
  }).slice(0,100),[variants,query]);

  const lines=Object.values(cart);
  const units=lines.reduce((a,x)=>a+x.qty,0);
  const itemTotal=lines.reduce((a,x)=>a+x.qty*x.cost,0);
  const grand=itemTotal+num(shipping)+num(taxes);

  const chooseSupplier=x=>{setSupplierId(x.id);setSupplierName(x.name||'');};
  const changeQty=(v,d)=>setCart(c=>{
    const old=c[v.id]||{variant:v,qty:0,cost:num(v.purchase_cost??v.item?.landed_cost??v.item?.purchase_cost)};
    const qty=Math.max(0,old.qty+d);
    const next={...c};
    if(qty===0)delete next[v.id];else next[v.id]={...old,qty};
    return next;
  });
  const setLineCost=(id,value)=>setCart(c=>c[id]?({...c,[id]:{...c[id],cost:num(value)}}):c);

  const save=async()=>{
    if(!supplierName.trim())return Alert.alert('Fornecedor','Seleciona ou escreve o fornecedor.');
    if(!lines.length)return Alert.alert('Sem artigos','Adiciona pelo menos uma variante à compra.');
    setBusy(true);
    try{
      const payload=lines.map(x=>({variant_id:x.variant.id,quantity:x.qty,unit_cost:x.cost}));
      const {data,error}=await supabase.rpc('physical_stock_receive_purchase',{
        p_supplier_id:supplierId,
        p_supplier:supplierName.trim(),
        p_invoice_reference:invoice||null,
        p_shipping_total:num(shipping),
        p_taxes_fees_total:num(taxes),
        p_payment_method:payment||null,
        p_document_url:documentUrl||null,
        p_notes:notes||null,
        p_lines:payload
      });
      if(error)throw error;
      Alert.alert('Compra recebida',`${units} unidade(s) adicionadas ao stock. Custo total registado: ${money(grand)}.`);
      onSaved(data);
    }catch(e){Alert.alert('Erro',String(e?.message||e));}
    finally{setBusy(false);}
  };

  return <BaseModal visible={visible} title="Receber compra / entrada de stock" onClose={onClose}>
    <Text style={s.help}>Esta operação acrescenta as unidades ao stock físico, cria o histórico de compra e recalcula o custo médio das variantes. Não mexe no Shopify.</Text>

    <Text style={s.label}>Fornecedor guardado</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:8}}>{suppliers.map(x=><Pill key={x.id} active={supplierId===x.id} onPress={()=>chooseSupplier(x)}>{x.name}</Pill>)}</ScrollView>
    <Field label="Fornecedor" value={supplierName} onChangeText={v=>{setSupplierName(v);if(suppliers.find(x=>x.id===supplierId)?.name!==v)setSupplierId(null);}} placeholder="Ex.: NANAMODA"/>
    <Field label="Referência / fatura" value={invoice} onChangeText={setInvoice}/>

    <Divider/>
    <Section title="Artigos recebidos" subtitle={`${units} unidade(s) selecionadas`}/>
    <TextInput value={query} onChangeText={setQuery} placeholder="Pesquisar produto, cor, tamanho ou SKU…" placeholderTextColor="#8190a8" style={s.search}/>
    {filtered.length===0?<Card><Text style={s.help}>Não há variantes para mostrar. Cria primeiro o produto e as variantes em Produtos.</Text></Card>:filtered.map(v=>{
      const line=cart[v.id];
      return <Card key={v.id}>
        <View style={s.between}>
          <View style={{flex:1}}><Text style={s.listTitle}>{v.item?.name||'Produto'}</Text><Text style={s.listSub}>{v.color} · {v.size}{v.sku?` · ${v.sku}`:''}</Text><Text style={s.detail}>Stock atual: {v.quantity_on_hand||0} · custo atual {money(v.purchase_cost??v.item?.landed_cost??v.item?.purchase_cost)}</Text></View>
          <View style={s.qtyBox}><View style={s.qtyBtn}><Text onPress={()=>changeQty(v,-1)} style={s.qtyBtnTxt}>−</Text></View><Text style={s.variantQty}>{line?.qty||0}</Text><View style={s.qtyBtn}><Text onPress={()=>changeQty(v,1)} style={s.qtyBtnTxt}>+</Text></View></View>
        </View>
        {!!line&&<View style={{marginTop:8}}><Field label="Custo de compra por unidade" value={String(line.cost)} onChangeText={x=>setLineCost(v.id,x)} keyboardType="decimal-pad"/></View>}
      </Card>;
    })}

    <Divider/>
    <View style={s.row}><View style={{flex:1}}><Field label="Transporte até nós" value={shipping} onChangeText={setShipping} keyboardType="decimal-pad"/></View><View style={{flex:1}}><Field label="IVA / taxas não incluídas" value={taxes} onChangeText={setTaxes} keyboardType="decimal-pad"/></View></View>
    <Field label="Método de pagamento" value={payment} onChangeText={setPayment} placeholder="Ex.: MB Way, cartão, dinheiro"/>
    <Field label="Documento / URL (opcional)" value={documentUrl} onChangeText={setDocumentUrl}/>
    <Field label="Notas" value={notes} onChangeText={setNotes} multiline/>

    <Card>
      <View style={s.between}><Text style={s.detail}>Produtos</Text><Text style={s.money}>{money(itemTotal)}</Text></View>
      <View style={s.between}><Text style={s.detail}>Transporte</Text><Text style={s.detail}>{money(shipping)}</Text></View>
      <View style={s.between}><Text style={s.detail}>IVA / taxas</Text><Text style={s.detail}>{money(taxes)}</Text></View>
      <Divider/>
      <View style={s.between}><Text style={s.cartTotal}>Total da compra</Text><Text style={s.cartTotal}>{money(grand)}</Text></View>
    </Card>
    <Button disabled={busy} onPress={save}>{busy?'A receber stock…':'Confirmar entrada de stock'}</Button>
  </BaseModal>;
}

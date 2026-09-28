import React from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import s from './styles';
import { MENU } from './lib';

export function Button({children,onPress,ghost=false,small=false,disabled=false}){
  return <TouchableOpacity disabled={disabled} onPress={onPress} style={[s.btn,ghost&&s.btnGhost,small&&s.btnSmall,disabled&&{opacity:.45}]}><Text style={[s.btnTxt,ghost&&s.btnGhostTxt]}>{children}</Text></TouchableOpacity>;
}
export function Field({label,value,onChangeText,placeholder,keyboardType='default',multiline=false}){
  return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput value={String(value??'')} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#8190a8" keyboardType={keyboardType} multiline={multiline} style={[s.input,multiline&&{minHeight:84,textAlignVertical:'top'}]}/></View>;
}
export function Pill({children,onPress,active=false}){const C=onPress?TouchableOpacity:View;return <C onPress={onPress} style={[s.pill,active&&s.pillOn]}><Text style={[s.pillTxt,active&&s.pillOnTxt]}>{children}</Text></C>;}
export function Card({children,style}){return <View style={[s.card,style]}>{children}</View>;}
export function Section({title,subtitle,action,onAction}){return <View style={s.titleRow}><View style={{flex:1}}><Text style={s.title}>{title}</Text>{!!subtitle&&<Text style={s.sub}>{subtitle}</Text>}</View>{!!action&&<Button small onPress={onAction}>{action}</Button>}</View>;}
export function Metric({label,value,hint}){return <Card style={s.metric}><Text style={s.metricLabel}>{label}</Text><Text style={s.metricValue}>{value}</Text>{!!hint&&<Text style={s.metricHint}>{hint}</Text>}</Card>;}
export function Empty({text}){return <View style={s.empty}><Text style={s.emptyTxt}>{text}</Text></View>;}
export function BaseModal({visible,title,onClose,children}){return <Modal visible={visible} animationType="slide" onRequestClose={onClose}><View style={s.modal}><View style={s.modalHead}><Text style={[s.modalTitle,{flex:1}]}>{title}</Text><TouchableOpacity onPress={onClose} style={s.close}><Text style={s.closeTxt}>✕</Text></TouchableOpacity></View><ScrollView contentContainerStyle={s.modalBody}>{children}</ScrollView></View></Modal>;}
export function Drawer({open,active,onClose,onChoose,counts}){
  return <Modal transparent visible={open} animationType="fade" onRequestClose={onClose}><Pressable style={s.drawerOverlay} onPress={onClose}><Pressable style={s.drawer} onPress={()=>{}}><View style={s.drawerHead}><Text style={s.drawerBrand}>BRILHAH</Text><Text style={s.drawerSub}>STOCK</Text></View><ScrollView contentContainerStyle={{paddingVertical:10}}>{MENU.map(([id,icon,label])=><TouchableOpacity key={id} onPress={()=>onChoose(id)} style={[s.drawerItem,active===id&&s.drawerItemOn]}><Text style={s.drawerIcon}>{icon}</Text><Text style={[s.drawerTxt,active===id&&s.drawerTxtOn]}>{label}</Text>{id==='stock'&&<Text style={s.count}>{counts.stock}</Text>}{id==='reservas'&&counts.reservas>0&&<Text style={s.count}>{counts.reservas}</Text>}</TouchableOpacity>)}</ScrollView><View style={{padding:18,borderTopWidth:1,borderTopColor:'#20314a'}}><Text style={{color:'#74849b',fontSize:11,textAlign:'center'}}>Mais que moda. É presença.</Text></View></Pressable></Pressable></Modal>;
}

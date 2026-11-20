package pt.nexus.assistant;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.GestureDescription;
import android.graphics.Path;
import android.os.Bundle;
import android.text.TextUtils;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import android.graphics.Rect;
import java.text.Normalizer;
import java.util.*;

/**
 * Explicit Android accessibility operator. Never persists or uploads screen content.
 * Only runs user-issued, local commands. Click targets that may cause irreversible
 * actions are denied; sending/paying/posting requires interaction in the actual app.
 */
public final class NexusAccessibilityService extends AccessibilityService {
 private static volatile NexusAccessibilityService current;
 public static boolean enabled(){return current!=null;}
 @Override protected void onServiceConnected(){super.onServiceConnected();current=this;}
 @Override public void onAccessibilityEvent(AccessibilityEvent e){}
 @Override public void onInterrupt(){}
 @Override public void onDestroy(){if(current==this)current=null;super.onDestroy();}
 private static String norm(String x){return Normalizer.normalize((x==null?"":x).toLowerCase(new Locale("pt","PT")),Normalizer.Form.NFD).replaceAll("\\p{M}+","").trim();}
 private static boolean denied(String text){
  String t=norm(text);
  return t.matches(".*\\b(enviar|publicar|partilhar|comprar|pagar|transferir|confirmar|finalizar|submeter|apagar|eliminar|excluir|desinstalar|aceitar permissao|permitir acesso)\\b.*");
 }
 private static boolean isHome(String q){return q.matches("^(vai|volta|regressa|ir|navega)\\s+(ao?\\s+)?(ecra inicial|inicio|home)$");}
 public static boolean handles(String raw){
  String q=norm(raw).replaceFirst("^(ola\\s+)?(nexus|nexos)[,:! ]*","");
  return q.matches("^(volta atras|retrocede|anterior|pagina anterior|passo atras|desce|sobe|desliza.*|faz scroll.*|scroll.*|rola.*|toca\\s+.*|clica\\s+.*|carrega\\s+.*|escreve\\s+.*|dita\\s+.*|insere\\s+texto.*|abre as notificacoes|mostra notificacoes|abre notificacoes)$")
    ||isHome(q);
 }
 public static String perform(String raw){
  String q=norm(raw).replaceFirst("^(ola\\s+)?(nexus|nexos)[,:! ]*","").trim();
  NexusAccessibilityService s=current;
  if(s==null)return "Para controlar botões e deslizar noutras aplicações, ativa NEXUS nas definições de Acessibilidade. É opcional.";
  try{
   if(q.matches("^(volta atras|retrocede|anterior|pagina anterior|passo atras)$")){s.performGlobalAction(GLOBAL_ACTION_BACK);return "Voltei atrás.";}
   if(isHome(q)){s.performGlobalAction(GLOBAL_ACTION_HOME);return "Voltei ao ecrã inicial.";}
   if(q.matches("^(abre as notificacoes|mostra notificacoes|abre notificacoes)$")){s.performGlobalAction(GLOBAL_ACTION_NOTIFICATIONS);return "Abri as notificações.";}
   if(q.matches("^(desce|desliza para baixo|faz scroll para baixo|scroll para baixo|rola para baixo|desliza para a direita)$")){
     s.swipe(q.contains("direita")?"right":"down");return "Deslizei no ecrã.";
   }
   if(q.matches("^(sobe|desliza para cima|faz scroll para cima|scroll para cima|rola para cima|desliza para a esquerda)$")){
     s.swipe(q.contains("esquerda")?"left":"up");return "Deslizei no ecrã.";
   }
   if(q.matches("^(toca|clica|carrega)\\s+.*")){
     String label=q.replaceFirst("^(toca|clica|carrega)\\s+(em|no|na|sobre|o|a)?\\s*","").trim();
     if(label.length()<2)return "Diz o nome do botão onde queres tocar.";
     if(denied(label))return "Essa ação pode ter consequências. Confirma-a manualmente na aplicação.";
     return s.clickText(label)?"Toquei em "+label+".":"Não encontrei um botão acessível com o nome "+label+".";
   }
   if(q.matches("^(escreve|dita|insere texto)\\s+.*")){
     String body=q.replaceFirst("^(escreve|dita|insere texto)\\s+","").trim();
     if(body.length()>320)return "O texto é demasiado longo. Divide-o em frases mais curtas.";
     return s.setFocusedText(body)?"Escrevi o texto no campo selecionado, sem o enviar.":"Seleciona primeiro um campo de texto para eu escrever.";
   }
  }catch(Exception e){return "Não consegui executar a ação nesta aplicação.";}
  return "Esse comando ainda não é suportado.";
 }
 private boolean clickText(String target){
  AccessibilityNodeInfo root=getRootInActiveWindow();
  if(root==null)return false;
  try{
   AccessibilityNodeInfo hit=findNode(root,norm(target),0);
   if(hit==null)return false;
   try{
    AccessibilityNodeInfo node=hit;
    while(node!=null){
     if(node.isClickable()&&node.isEnabled()){boolean ok=node.performAction(AccessibilityNodeInfo.ACTION_CLICK);if(node!=hit)node.recycle();return ok;}
     AccessibilityNodeInfo parent=node.getParent();
     if(node!=hit)node.recycle();
     node=parent;
    }
   }finally{hit.recycle();}
   return false;
  }finally{root.recycle();}
 }
 private AccessibilityNodeInfo findNode(AccessibilityNodeInfo node,String text,int depth){
  if(node==null||depth>20)return null;
  String label=norm(String.valueOf(node.getText()==null?"":node.getText()));
  String desc=norm(String.valueOf(node.getContentDescription()==null?"":node.getContentDescription()));
  if(node.isVisibleToUser()&&node.isEnabled()&&(label.equals(text)||desc.equals(text)||label.startsWith(text)||desc.startsWith(text))){
   return AccessibilityNodeInfo.obtain(node);
  }
  for(int i=0;i<node.getChildCount();i++){
   AccessibilityNodeInfo child=node.getChild(i);
   if(child==null)continue;
   try{AccessibilityNodeInfo found=findNode(child,text,depth+1);if(found!=null)return found;}
   finally{child.recycle();}
  }
  return null;
 }
 private boolean setFocusedText(String text){
  AccessibilityNodeInfo root=getRootInActiveWindow();if(root==null)return false;
  try{
   AccessibilityNodeInfo input=root.findFocus(AccessibilityNodeInfo.FOCUS_INPUT);
   if(input==null||!input.isEditable()||input.isPassword())return false;
   try{
    Bundle b=new Bundle();b.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE,text);
    return input.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT,b);
   }finally{input.recycle();}
  }finally{root.recycle();}
 }
 private void swipe(String direction){
  int w=getResources().getDisplayMetrics().widthPixels,h=getResources().getDisplayMetrics().heightPixels;
  float x1=w*.50f,y1=h*.70f,x2=x1,y2=h*.30f;
  if(direction.equals("up")){y1=h*.35f;y2=h*.75f;}
  if(direction.equals("left")){x1=w*.80f;x2=w*.20f;y1=y2=h*.50f;}
  if(direction.equals("right")){x1=w*.20f;x2=w*.80f;y1=y2=h*.50f;}
  Path p=new Path();p.moveTo(x1,y1);p.lineTo(x2,y2);
  GestureDescription g=new GestureDescription.Builder()
    .addStroke(new GestureDescription.StrokeDescription(p,0,400)).build();
  dispatchGesture(g,null,null);
 }
}

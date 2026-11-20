package pt.nexus.assistant;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.PixelFormat;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import android.os.IBinder;
import android.provider.Settings;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

/**
 * User-activated floating control. No covert audio or camera capture.
 * Swipe-left/right produces an animated 3D rotation of topic cards.
 * Optional hand-wave is a simple proximity sensor (no camera, not hand tracking).
 */
public final class BubbleService extends Service implements SensorEventListener {
    public static volatile boolean active = false;
    private static final String CHANNEL = "nexus_floating_v3";
    private final String[] headings = {"✦  NEXUS", "◉  VOZ", "▣  APLICAÇÕES", "◎  GESTOS", "☷  CONTROLOS"};
    private final String[] descriptions = {
        "CENTRO HOLOGRÁFICO\nDesliza para os lados para rodar o painel.",
        "COMANDO POR VOZ\nDiz 'abre Facebook', 'abre Instagram' ou faz outra pergunta.",
        "MULTITAREFA ANDROID\nAbre aplicações instaladas; o Android gere as que ficam em segundo plano.",
        "GESTOS SEM TOQUE\nCom um sensor de proximidade, passa a mão perto da zona superior do telemóvel para rodar o painel.",
        "NAVEGAÇÃO\nAbre o NEXUS, regressa ao ecrã inicial ou minimiza este controlo."
    };
    private int current = 0;
    private int smallX, smallY;
    private boolean expanded = false, rotating = false, airEnabled = false, wasNear = false;
    private long lastWave = 0;
    private WindowManager windowManager;
    private WindowManager.LayoutParams params;
    private FrameLayout root;
    private FrameLayout cardFrame;
    private TextView orb;
    private TextView title, desc, pageNumber, airButton;
    private SensorManager sensors;
    private Sensor proximity;
    private int panelWidth;
    private int dp(float amount) { return Math.round(amount * getResources().getDisplayMetrics().density); }

    private GradientDrawable gradient(int start, int end, float radius, int stroke) {
        GradientDrawable d = new GradientDrawable(GradientDrawable.Orientation.TL_BR, new int[]{start,end});
        d.setCornerRadius(dp(radius)); d.setStroke(dp(1), stroke); return d;
    }
    private TextView text(String value, float size, int color) {
        TextView t = new TextView(this); t.setText(value); t.setTextSize(size); t.setTextColor(color); t.setGravity(Gravity.CENTER); return t;
    }
    private void actionMessage(String s) { Toast.makeText(this, s, Toast.LENGTH_SHORT).show(); }
    private void setSize(int w, int h) {
        if (params==null || root==null) return;
        params.width=w;params.height=h;
        try { windowManager.updateViewLayout(root,params); } catch(Exception ignored){}
    }
    private void showBubble() {
        expanded=false;rotating=false;
        root.removeAllViews();
        smallX=Math.max(dp(0),params.x);smallY=Math.max(dp(0),params.y);
        orb=text("✦",32,0xffd9f7ff);
        orb.setBackground(gradient(0xff155b8a,0xff081b33,46,0xff86eaff));
        orb.setElevation(dp(10));
        FrameLayout.LayoutParams op=new FrameLayout.LayoutParams(-1,-1);root.addView(orb,op);
        final float[] start={0,0};final int[] position={0,0};final long[] downAt={0};
        orb.setOnTouchListener((v,e)->{
            switch(e.getActionMasked()){
                case MotionEvent.ACTION_DOWN:
                    start[0]=e.getRawX();start[1]=e.getRawY();position[0]=params.x;position[1]=params.y;downAt[0]=System.currentTimeMillis();return true;
                case MotionEvent.ACTION_MOVE:
                    int dx=(int)(e.getRawX()-start[0]),dy=(int)(e.getRawY()-start[1]);
                    if(Math.abs(dx)>dp(11)||Math.abs(dy)>dp(11)){
                        params.x=Math.max(0,Math.min(getResources().getDisplayMetrics().widthPixels-dp(66),position[0]+dx));
                        params.y=Math.max(0,Math.min(getResources().getDisplayMetrics().heightPixels-dp(66),position[1]+dy));
                        try{windowManager.updateViewLayout(root,params);}catch(Exception ignored){}
                    }
                    return true;
                case MotionEvent.ACTION_UP:
                    if(Math.abs(e.getRawX()-start[0])<dp(11)&&Math.abs(e.getRawY()-start[1])<dp(11))expand();
                    return true;
            }
            return false;
        });
        setSize(dp(66),dp(66));
    }
    private void expand() {
        expanded=true; root.removeAllViews();
        int screen=getResources().getDisplayMetrics().widthPixels;
        panelWidth=Math.min(screen-dp(22),dp(376));
        params.x=Math.max(dp(8),(screen-panelWidth)/2);
        params.y=Math.max(dp(80),Math.min(params.y-dp(100),getResources().getDisplayMetrics().heightPixels-dp(360)));
        setSize(panelWidth,dp(346));

        LinearLayout body=new LinearLayout(this);body.setOrientation(LinearLayout.VERTICAL);
        body.setPadding(dp(14),dp(12),dp(14),dp(11));
        body.setBackground(gradient(0xf0163652,0xf0091429,23,0xff55bfe8));
        body.setElevation(dp(16));
        root.addView(body,new FrameLayout.LayoutParams(-1,-1));
        LinearLayout header=new LinearLayout(this);header.setGravity(Gravity.CENTER_VERTICAL);
        TextView caption=text("✦ NEXUS  ·  PAINEL FLUTUANTE",12,0xffa5f4ff);
        caption.setLetterSpacing(.17f);
        header.addView(caption,new LinearLayout.LayoutParams(0,dp(44),1));
        Button shrink=smallButton("−");shrink.setContentDescription("Minimizar painel");shrink.setOnClickListener(v->showBubble());
        header.addView(shrink,new LinearLayout.LayoutParams(dp(46),dp(42)));
        body.addView(header);

        cardFrame=new FrameLayout(this);cardFrame.setBackground(gradient(0xff123352,0xff0b2038,18,0xff3989b2));
        cardFrame.setCameraDistance(dp(16000));
        body.addView(cardFrame,new LinearLayout.LayoutParams(-1,0,1));
        LinearLayout inside=new LinearLayout(this);inside.setGravity(Gravity.CENTER);inside.setOrientation(LinearLayout.VERTICAL);
        inside.setPadding(dp(14),dp(12),dp(14),dp(12));
        title=text("",19,0xff7ee5ff);title.setTypeface(Typeface.DEFAULT,Typeface.BOLD);title.setLetterSpacing(.10f);
        desc=text("",14,0xffddf5ff);desc.setPadding(dp(8),dp(13),dp(8),dp(6));
        inside.addView(title,new LinearLayout.LayoutParams(-1,dp(51)));
        inside.addView(desc,new LinearLayout.LayoutParams(-1,0,1));
        cardFrame.addView(inside,new FrameLayout.LayoutParams(-1,-1));
        final float[] startX={0},startY={0};
        cardFrame.setOnTouchListener((v,e)->{
            if(e.getActionMasked()==MotionEvent.ACTION_DOWN){startX[0]=e.getX();startY[0]=e.getY();return true;}
            if(e.getActionMasked()==MotionEvent.ACTION_UP){float dx=e.getX()-startX[0];
                if(Math.abs(dx)>dp(32)&&Math.abs(dx)>Math.abs(e.getY()-startY[0]))rotate(dx<0?1:-1);
                else primaryAction();return true;}
            return true;
        });

        LinearLayout nav=new LinearLayout(this);nav.setGravity(Gravity.CENTER);nav.setPadding(0,dp(9),0,dp(7));
        Button prev=smallButton("❮");prev.setContentDescription("Rodar para trás");prev.setOnClickListener(v->rotate(-1));
        pageNumber=text("",12,0xff9ed7ee);pageNumber.setLetterSpacing(.14f);
        Button next=smallButton("❯");next.setContentDescription("Rodar para a frente");next.setOnClickListener(v->rotate(1));
        nav.addView(prev,new LinearLayout.LayoutParams(dp(52),dp(42)));
        nav.addView(pageNumber,new LinearLayout.LayoutParams(0,dp(42),1));
        nav.addView(next,new LinearLayout.LayoutParams(dp(52),dp(42)));
        body.addView(nav);

        LinearLayout footer=new LinearLayout(this);footer.setGravity(Gravity.CENTER_VERTICAL);
        Button action=smallButton("▶  EXECUTAR");action.setTextSize(12);action.setOnClickListener(v->primaryAction());
        footer.addView(action,new LinearLayout.LayoutParams(0,dp(44),1));
        airButton=text("",11,0xff82eaf5);
        airButton.setBackground(gradient(0xff0a3350,0xff082137,12,0xff377a96));
        airButton.setOnClickListener(v->toggleAir());
        footer.addView(airButton,new LinearLayout.LayoutParams(dp(112),dp(43)));
        body.addView(footer);
        updateAirLabel();updateCard();
    }
    private Button smallButton(String label){Button b=new Button(this);b.setText(label);b.setTextSize(20);b.setAllCaps(false);b.setPadding(0,0,0,0);b.setTextColor(0xffc8f4ff);b.setBackgroundTintList(android.content.res.ColorStateList.valueOf(0xff15476a));return b;}
    private void updateCard(){if(title==null||!expanded)return;title.setText(headings[current]);desc.setText(descriptions[current]);pageNumber.setText(String.format(java.util.Locale.ROOT,"%02d  /  %02d  ·  DESLIZA ↔",current+1,headings.length));}
    private void rotate(int dir){if(!expanded||rotating||cardFrame==null)return;rotating=true;
        float out=dir>=0?-88:88;
        cardFrame.animate().cancel();
        cardFrame.animate().rotationY(out).alpha(.4f).scaleX(.92f).setDuration(185).withEndAction(()->{
            current=(current+dir+headings.length)%headings.length;updateCard();
            cardFrame.setRotationY(-out);cardFrame.setAlpha(.45f);
            cardFrame.animate().rotationY(0).alpha(1f).scaleX(1f).setDuration(200).withEndAction(()->rotating=false).start();
        }).start();
    }
    private void primaryAction(){
        switch(current){
            case 0:case 4:launch(MainActivity.class);break;
            case 1:launch(VoiceCommandActivity.class);break;
            case 2:launch(VoiceCommandActivity.class);break;
            case 3:toggleAir();break;
        }
    }
    private void launch(Class<?> activity){
        Intent i=new Intent(this,activity);i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_SINGLE_TOP);
        try{startActivity(i);}catch(Exception ex){actionMessage("Toca na notificação NEXUS para abrir a aplicação.");}
    }
    private void toggleAir(){
        if(proximity==null){actionMessage("Este dispositivo não disponibiliza o sensor de proximidade.");return;}
        airEnabled=!airEnabled;
        if(airEnabled){wasNear=false;sensors.registerListener(this,proximity,SensorManager.SENSOR_DELAY_NORMAL);}
        else sensors.unregisterListener(this);
        updateAirLabel();
        actionMessage(airEnabled?"Gesto no ar ativo: passa a mão junto ao sensor superior.":"Gesto no ar desativado.");
    }
    private void updateAirLabel(){if(airButton!=null)airButton.setText(proximity==null?"SEM SENSOR":airEnabled?"✋ AR: LIGADO":"✋ AR: DESL.");}
    @Override public void onSensorChanged(SensorEvent e){
        if(!airEnabled||!expanded||proximity==null||e.sensor.getType()!=Sensor.TYPE_PROXIMITY)return;
        boolean near=e.values[0]<proximity.getMaximumRange();
        if(near)wasNear=true;
        else if(wasNear){wasNear=false;long now=System.currentTimeMillis();if(now-lastWave>950){lastWave=now;if(cardFrame!=null)cardFrame.post(()->rotate(1));}}
    }
    @Override public void onAccuracyChanged(Sensor sensor,int accuracy){}
    @Override public int onStartCommand(Intent intent,int flags,int startId){
        if(intent!=null&&"STOP".equals(intent.getAction())){stopSelf();return START_NOT_STICKY;}
        if(!Settings.canDrawOverlays(this)){stopSelf();return START_NOT_STICKY;}
        if(root!=null)return START_NOT_STICKY;
        NotificationManager nm=getSystemService(NotificationManager.class);
        nm.createNotificationChannel(new NotificationChannel(CHANNEL,"NEXUS — Controlos flutuantes",NotificationManager.IMPORTANCE_LOW));
        PendingIntent open=PendingIntent.getActivity(this,100,new Intent(this,MainActivity.class),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        Intent closeIntent=new Intent(this,BubbleService.class).setAction("STOP");
        PendingIntent stop=PendingIntent.getService(this,101,closeIntent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        Notification n=new Notification.Builder(this,CHANNEL).setSmallIcon(R.drawable.nexus_icon)
          .setContentTitle("NEXUS — Controlo holográfico")
          .setContentText("Toca na esfera para abrir painéis. Voz só após o teu toque.")
          .setContentIntent(open).setOngoing(true)
          .addAction(new Notification.Action.Builder(R.drawable.nexus_icon,"Desativar",stop).build()).build();
        if(Build.VERSION.SDK_INT>=34)startForeground(911,n,ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
        else startForeground(911,n);
        sensors=(SensorManager)getSystemService(SENSOR_SERVICE);
        proximity=sensors==null?null:sensors.getDefaultSensor(Sensor.TYPE_PROXIMITY);
        windowManager=(WindowManager)getSystemService(WINDOW_SERVICE);
        root=new FrameLayout(this);
        params=new WindowManager.LayoutParams(dp(66),dp(66),WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
          WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE|WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,PixelFormat.TRANSLUCENT);
        params.gravity=Gravity.TOP|Gravity.LEFT;
        params.x=getResources().getDisplayMetrics().widthPixels-dp(72);
        params.y=getResources().getDisplayMetrics().heightPixels/2;
        windowManager.addView(root,params);
        showBubble();active=true;
        return START_NOT_STICKY;
    }
    @Override public void onTaskRemoved(Intent intent){stopSelf();super.onTaskRemoved(intent);}
    @Override public void onDestroy(){active=false;airEnabled=false;expanded=false;rotating=false;
        if(cardFrame!=null){cardFrame.animate().withEndAction(null);cardFrame.animate().cancel();}
        if(sensors!=null)sensors.unregisterListener(this);
        if(root!=null&&windowManager!=null)try{windowManager.removeView(root);}catch(Exception ignored){}
        root=null;stopForeground(STOP_FOREGROUND_REMOVE);super.onDestroy();
    }
    @Override public IBinder onBind(Intent intent){return null;}
}

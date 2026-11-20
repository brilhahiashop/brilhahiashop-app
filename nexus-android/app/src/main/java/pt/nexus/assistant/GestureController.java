package pt.nexus.assistant;

import android.app.Activity;
import android.graphics.Bitmap;
import android.graphics.SurfaceTexture;
import android.hardware.Camera;
import android.os.Handler;
import android.os.Looper;
import android.view.TextureView;
import android.widget.*;
import com.google.mediapipe.framework.image.BitmapImageBuilder;
import com.google.mediapipe.framework.image.MPImage;
import com.google.mediapipe.tasks.core.BaseOptions;
import com.google.mediapipe.tasks.vision.core.RunningMode;
import com.google.mediapipe.tasks.vision.gesturerecognizer.GestureRecognizer;
import com.google.mediapipe.tasks.vision.gesturerecognizer.GestureRecognizerResult;
import java.util.concurrent.*;
import java.util.function.Consumer;

/** Opt-in, visible front-camera preview. Frames stay in memory; no recording or network. */
@SuppressWarnings("deprecation")
final class GestureController implements AutoCloseable {
 private final Activity activity;private final LinearLayout root,bar;private final TextureView preview;
 private final Handler ui=new Handler(Looper.getMainLooper());private final ExecutorService worker=Executors.newSingleThreadExecutor();
 private final Consumer<String> action;private Camera camera;private GestureRecognizer model;
 private volatile boolean closed=false,busy=false;private float anchor=-1;private long anchorTime=0,lastAction=0;private int openFrames=0,confirmFrames=0;private boolean armed=false;
 GestureController(Activity a,LinearLayout container,Consumer<String> callback){activity=a;root=container;action=callback;
  bar=new LinearLayout(a);bar.setBackgroundColor(0xff09283a);preview=new TextureView(a);bar.addView(preview,new LinearLayout.LayoutParams(140,110));
  TextView label=new TextView(a);label.setText("CÂMARA ATIVA · processamento local\nMão aberta: selecionar · polegar: confirmar\nDesloca a mão para rodar painéis");label.setTextSize(10);label.setTextColor(0xffc0ffff);bar.addView(label,new LinearLayout.LayoutParams(0,110,1));Button stop=new Button(a);stop.setText("PARAR");stop.setTextSize(10);stop.setOnClickListener(v->close());bar.addView(stop,new LinearLayout.LayoutParams(90,110));root.addView(bar,1);
  preview.setSurfaceTextureListener(new TextureView.SurfaceTextureListener(){public void onSurfaceTextureAvailable(SurfaceTexture texture,int w,int h){startCamera(texture);}public void onSurfaceTextureSizeChanged(SurfaceTexture t,int w,int h){}public boolean onSurfaceTextureDestroyed(SurfaceTexture t){releaseCamera();return true;}public void onSurfaceTextureUpdated(SurfaceTexture t){}});
  worker.execute(()->{try{model=GestureRecognizer.createFromOptions(a,GestureRecognizer.GestureRecognizerOptions.builder().setBaseOptions(BaseOptions.builder().setModelAssetPath("gesture_recognizer.task").build()).setRunningMode(RunningMode.IMAGE).setNumHands(1).setMinHandDetectionConfidence(.65f).build());ui.post(tick);}catch(Exception e){ui.post(()->{callback.accept("unavailable");close();});}});
 }
 private void startCamera(SurfaceTexture texture){if(closed)return;try{int front=-1;Camera.CameraInfo info=new Camera.CameraInfo();for(int i=0;i<Camera.getNumberOfCameras();i++){Camera.getCameraInfo(i,info);if(info.facing==Camera.CameraInfo.CAMERA_FACING_FRONT){front=i;break;}}if(front<0)throw new IllegalStateException();Camera.CameraInfo selected=new Camera.CameraInfo();Camera.getCameraInfo(front,selected);camera=Camera.open(front);int rotation=activity.getWindowManager().getDefaultDisplay().getRotation()*90;camera.setDisplayOrientation((360-(selected.orientation+rotation)%360)%360);camera.setPreviewTexture(texture);camera.startPreview();}catch(Exception e){action.accept("unavailable");close();}}
 private final Runnable tick=new Runnable(){public void run(){if(closed)return;ui.postDelayed(this,280);if(busy||camera==null||!preview.isAvailable())return;Bitmap bitmap=preview.getBitmap(256,256);if(bitmap==null)return;busy=true;worker.execute(()->{MPImage image=null;try{if(!closed&&model!=null){image=new BitmapImageBuilder(bitmap).build();GestureRecognizerResult result=model.recognize(image);ui.post(()->consume(result));}}catch(Exception e){ui.post(()->{if(!closed){action.accept("unavailable");close();}});}finally{if(image!=null)image.close();bitmap.recycle();busy=false;}});}};
 private void consume(GestureRecognizerResult result){if(closed)return;long now=android.os.SystemClock.elapsedRealtime();if(result.landmarks().isEmpty()){anchor=-1;openFrames=confirmFrames=0;return;}float x=result.landmarks().get(0).get(0).x();String gesture="";if(!result.gestures().isEmpty()&&!result.gestures().get(0).isEmpty()&&result.gestures().get(0).get(0).score()>.65f)gesture=result.gestures().get(0).get(0).categoryName();
  if(now-lastAction<1100)return;
  if(anchor<0||now-anchorTime>1400){anchor=x;anchorTime=now;}
  if(Math.abs(x-anchor)>.22f){action.accept(x>anchor?"next":"previous");anchor=x;anchorTime=now;lastAction=now;return;}
  openFrames=gesture.equals("Open_Palm")?openFrames+1:0;confirmFrames=gesture.equals("Thumb_Up")?confirmFrames+1:0;
  if(openFrames>=3&&!armed){armed=true;action.accept("select");lastAction=now;}
  if(confirmFrames>=3&&armed){armed=false;action.accept("confirm");lastAction=now;}
 }
 private void releaseCamera(){if(camera!=null){try{camera.stopPreview();}catch(Exception ignored){}camera.release();camera=null;}}
 @Override public void close(){if(closed)return;closed=true;ui.removeCallbacksAndMessages(null);releaseCamera();root.removeView(bar);action.accept("stopped");worker.execute(()->{if(model!=null){model.close();model=null;}});worker.shutdown();}
}

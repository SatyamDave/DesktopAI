import { ipcMain, desktopCapturer, nativeImage, BrowserWindow } from "electron";
import { Worker } from "worker_threads";
import * as path from "node:path";

ipcMain.handle("captureFullScreen", async () => {
  const win = BrowserWindow.getFocusedWindow();
  const [src] = await desktopCapturer.getSources({
    types:["screen"],
    thumbnailSize:{ width:0, height:0 }
  });
  if(!src) return { success:false, error:"No screen source" };

  const png = src.thumbnail.toPNG();              // Buffer
  return new Promise(res=>{
    const w = new Worker(path.join(__dirname,"ocrWorker.js"), {workerData:png});
    w.on("message", res);
    w.on("error", e=> res({success:false,error:e.message}));
  });
}); 
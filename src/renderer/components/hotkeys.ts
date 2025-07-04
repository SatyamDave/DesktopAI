import { useEffect } from "react";
import { pushToast } from "./makeToast";
export function useScreenSummaryHotkey(){
  useEffect(()=>{
    const onKey = (e:KeyboardEvent)=>{
      if(e.altKey && e.code==="Backquote"){
        (window as any).electronAPI.captureFullScreen()
          .then((r:any)=>{
            if(r.success) pushToast(r.summary);
            else          pushToast("⚠ "+r.error);
          });
      }
    };
    window.addEventListener("keydown",onKey);
    return ()=>window.removeEventListener("keydown",onKey);
  },[]);
} 
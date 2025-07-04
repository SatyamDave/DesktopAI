import { createPortal } from "react-dom";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

let push:(t:string)=>void = ()=>{};
export function pushToast(t:string){ push(t); }

export function ToastHost(){
  const [list,set] = useState<string[]>([]);
  useEffect(()=>{ push = t=> set(p=>[...p,t]); },[]);
  return createPortal(
    <div style={{position:"fixed",top:16,right:16,zIndex:9999}}>
      <AnimatePresence>
        {list.map((txt,i)=>(
          <motion.div key={i}
            initial={{opacity:0,y:-20}} animate={{opacity:1,y:0}}
            exit={{opacity:0,y:-20}}
            style={{marginBottom:8,padding:"8px 12px",
                    background:"rgba(0,0,0,.7)",color:"#fff",
                    borderRadius:8,maxWidth:320,fontSize:12}}>
            {txt}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>, document.body
  );
} 
import {useEffect,useState} from 'react';
import {Download} from 'lucide-react';

type BeforeInstallPromptEvent=Event&{
 prompt:()=>Promise<void>;
 userChoice:Promise<{outcome:'accepted'|'dismissed';platform?:string}>;
};

export default function PWAInstallButton(){
 const[promptEvent,setPromptEvent]=useState<BeforeInstallPromptEvent|null>(null);
 useEffect(()=>{
  const onBeforeInstall=(event:Event)=>{
   event.preventDefault();
   setPromptEvent(event as BeforeInstallPromptEvent);
  };
  const onInstalled=()=>setPromptEvent(null);
  window.addEventListener('beforeinstallprompt',onBeforeInstall as EventListener);
  window.addEventListener('appinstalled',onInstalled);
  return()=>{
   window.removeEventListener('beforeinstallprompt',onBeforeInstall as EventListener);
   window.removeEventListener('appinstalled',onInstalled);
  };
 },[]);
 async function install(){
  const current=promptEvent;
  if(!current)return;
  try{
   await current.prompt();
   await current.userChoice;
  }catch{
   // The browser owns the install prompt and may reject a dismissed or stale event.
  }finally{
   setPromptEvent(null);
  }
 }
 if(!promptEvent)return null;
 return <button type="button" className="outline small" onClick={()=>void install()} aria-label="Install BiddWorld app">
  <Download size={15}/> Install App
 </button>;
}

import {useEffect,useRef,useState} from 'react';
import {RefreshCw,CheckCircle2,XCircle,Save} from 'lucide-react';
import {supabase} from '../lib/supabase';
type Row={id:string;title:string;description:string;category:string|null;image_paths:string[];starting_price:number;expected_price:number;minimum_increment:number;starts_at:string;ends_at:string|null;optional_details:Record<string,string>;created_at:string;submitted_by:string};
export default function AdminAuctionSubmissionReview(){
 const[rows,setRows]=useState<Row[]>([]),[urls,setUrls]=useState<Record<string,string[]>>({}),[edit,setEdit]=useState<Record<string,Partial<Row>>>({}),[notes,setNotes]=useState<Record<string,string>>({}),[busy,setBusy]=useState(''),[message,setMessage]=useState('');const reviewInFlight=useRef(false);
 async function load(){if(!supabase)return;const{data,error}=await supabase.rpc('admin_list_auction_submissions');if(error){setMessage(error.message);return;}const list=(data??[]) as Row[];setRows(list);const next:Record<string,string[]>={};await Promise.all(list.map(async r=>{const signed=await Promise.all((r.image_paths??[]).map(async path=>{const{data}=await supabase!.storage.from('auction-submission-media').createSignedUrl(path,300);return data?.signedUrl??''}));next[r.id]=signed.filter(Boolean)}));setUrls(next)}
 useEffect(()=>{void load()},[]);
 function val(r:Row,key:keyof Row){return (edit[r.id]?.[key]??r[key]) as never}
 async function decide(r:Row,decision:'approve'|'reject'){
  if(!supabase||reviewInFlight.current)return;
  if(!window.confirm(decision==='approve'?'Approve and publish this auction with the edited details?':'Reject this auction submission?'))return;
  reviewInFlight.current=true;setBusy(r.id);setMessage('');
  const publishedPaths:string[]=[];let rpcAttempted=false;let rpcDefinitelyRejected=false;
  try{
   const v=edit[r.id]??{};
   const title=String(v.title??r.title).trim(),description=String(v.description??r.description).trim();
   const starting=Number(v.starting_price??r.starting_price),expected=Number(v.expected_price??r.expected_price),increment=Number(v.minimum_increment??r.minimum_increment);
   const startsAt=String(v.starts_at??r.starts_at);
   if(decision==='approve'){
    if(title.length<3||title.length>180)throw new Error('Auction title must be 3 to 180 characters.');
    if(description.length<20||description.length>10000)throw new Error('Description must be 20 to 10,000 characters.');
    if(!Number.isFinite(starting)||starting<=0)throw new Error('Starting Price must be greater than zero.');
    if(!Number.isFinite(expected)||expected<starting)throw new Error('Expected Price must be equal to or greater than Starting Price.');
    if(!Number.isFinite(increment)||increment<=0)throw new Error('Minimum Bid Increment must be greater than zero.');
    if(!startsAt||!Number.isFinite(new Date(startsAt).getTime()))throw new Error('Choose a valid auction start date and time.');
    if(!Array.isArray(r.image_paths)||r.image_paths.length<1||r.image_paths.length>8)throw new Error('The submission must contain 1 to 8 item images.');
   }
   let approvedImagePaths=v.image_paths??r.image_paths;
   if(decision==='approve'){
    for(const privatePath of r.image_paths){
     const{data:blob,error:downloadError}=await supabase.storage.from('auction-submission-media').download(privatePath);
     if(downloadError||!blob)throw downloadError??new Error('Could not read submitted item image.');
     const filename=privatePath.split('/').pop()??crypto.randomUUID()+'.jpg';
     const publicPath=r.submitted_by+'/'+crypto.randomUUID()+'-'+filename;
     const{error:uploadError}=await supabase.storage.from('product-media').upload(publicPath,blob,{upsert:false,contentType:blob.type||'image/jpeg'});
     if(uploadError)throw uploadError;
     publishedPaths.push(publicPath);
    }
    approvedImagePaths=publishedPaths;
   }
   rpcAttempted=true;
   const{error}=await supabase.rpc('admin_review_auction_submission',{p_submission_id:r.id,p_decision:decision,p_title:title,p_description:description,p_category:v.category??r.category,p_image_paths:approvedImagePaths,p_starting_price:starting,p_expected_price:expected,p_minimum_increment:increment,p_starts_at:startsAt,p_optional_details:v.optional_details??r.optional_details,p_review_note:notes[r.id]??null});
   if(error){rpcDefinitelyRejected=typeof (error as {code?:unknown}).code==='string';throw error;}
   setEdit(current=>{const next={...current};delete next[r.id];return next;});setNotes(current=>{const next={...current};delete next[r.id];return next;});
   setMessage(decision==='approve'?'Auction approved and published.':'Auction rejected.');
   await load();
  }catch(e){
   const reason=e instanceof Error?e.message:'Review action failed.';
   if(publishedPaths.length>0&&(!rpcAttempted||rpcDefinitelyRejected)){
    try{const{error:cleanupError}=await supabase.storage.from('product-media').remove(publishedPaths);setMessage(cleanupError?reason+' Some temporary public images could not be cleaned up.':reason);}
    catch{setMessage(reason+' Some temporary public images could not be cleaned up.');}
   }else setMessage(reason);
  }finally{reviewInFlight.current=false;setBusy('');}
 }
 return <section className="adminModuleDetail" style={{marginTop:18}}><header style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}><div><h3>Member Auction Submissions ({rows.length})</h3><p>Review and edit member listings. Only approved auctions enter the public catalogue. End time is automatic: 48 hours after the expected price is reached.</p></div><button className="outline small" onClick={()=>void load()}><RefreshCw size={14}/> Refresh</button></header>{message&&<div className="notice" role="status">{message}</div>}
 {rows.length===0?<div className="empty">No auction submissions are pending review.</div>:rows.map(r=><article key={r.id} style={{display:'grid',gap:9,padding:14,borderTop:'1px solid var(--border,#ddd)'}}>
 <b>Submitted: {new Date(r.created_at).toLocaleString()}</b><div style={{display:'flex',gap:8,overflowX:'auto'}}>{(urls[r.id]??[]).map((url,i)=><img key={url} src={url} alt={'Auction item '+(i+1)} style={{width:112,height:92,objectFit:'cover',borderRadius:8}}/>)}</div>
 <label>Title<input value={val(r,'title')} onChange={e=>setEdit(s=>({...s,[r.id]:{...s[r.id],title:e.target.value}}))}/></label>
 <label>Description<textarea rows={4} value={val(r,'description')} onChange={e=>setEdit(s=>({...s,[r.id]:{...s[r.id],description:e.target.value}}))}/></label>
 <label>Category<input value={String(val(r,'category')??'')} onChange={e=>setEdit(s=>({...s,[r.id]:{...s[r.id],category:e.target.value}}))}/></label><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:8}}>{Object.entries(r.optional_details??{}).map(([key,value])=><label key={key}>{key}<input value={String((edit[r.id]?.optional_details??r.optional_details)?.[key]??value)} onChange={e=>setEdit(s=>({...s,[r.id]:{...s[r.id],optional_details:{...(s[r.id]?.optional_details??r.optional_details),[key]:e.target.value}}}))}/></label>)}</div>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:8}}><label>Starting Price<input type="number" min="0.01" step="0.01" value={val(r,'starting_price')} onChange={e=>setEdit(s=>({...s,[r.id]:{...s[r.id],starting_price:Number(e.target.value)}}))}/></label><label>Expected Price<input type="number" min="0.01" step="0.01" value={val(r,'expected_price')} onChange={e=>setEdit(s=>({...s,[r.id]:{...s[r.id],expected_price:Number(e.target.value)}}))}/></label><label>Bid Increment<input type="number" min="0.01" step="0.01" value={val(r,'minimum_increment')} onChange={e=>setEdit(s=>({...s,[r.id]:{...s[r.id],minimum_increment:Number(e.target.value)}}))}/></label><label>Starts At<input type="datetime-local" value={String(val(r,'starts_at')).slice(0,16)} onChange={e=>setEdit(s=>({...s,[r.id]:{...s[r.id],starts_at:e.target.value&&Number.isFinite(new Date(e.target.value).getTime())?new Date(e.target.value).toISOString():''}}))}/></label></div>
 <label>Review Note (Optional)<textarea rows={2} maxLength={500} value={notes[r.id]??''} onChange={e=>setNotes(s=>({...s,[r.id]:e.target.value}))}/></label>
 <div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button className="primary small" disabled={!!busy} onClick={()=>void decide(r,'approve')}><CheckCircle2 size={15}/> Approve & Publish</button><button className="outline small" disabled={!!busy} onClick={()=>void decide(r,'reject')}><XCircle size={15}/> Reject</button></div>
 </article>)}</section>;
}

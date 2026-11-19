import {useCallback,useEffect,useRef,useState} from 'react';
import {Bell,Send,RefreshCw,CheckCheck} from 'lucide-react';
import {supabase} from '../lib/supabase';

type Notice={id:string;user_id:string;recipient_member_code?:string;recipient_name?:string;title:string;message:string;category:string;read_at:string|null;created_at:string};
const PAGE_SIZE=100;
export default function Notifications({isAdmin=false}:{isAdmin?:boolean}){
 const requestSeq=useRef(0),recipientLookupSeq=useRef(0),loadMoreBusy=useRef(false),markReadBusy=useRef(new Set<string>()),markAllBusy=useRef(false),sendKey=useRef<{key:string;fingerprint:string}|null>(null);
 const [items,setItems]=useState<Notice[]>([]),[userId,setUserId]=useState(''),[recipientSearch,setRecipientSearch]=useState(''),[recipientOptions,setRecipientOptions]=useState<{user_id:string;member_code:string;display_name:string;phone:string}[]>([]),[recipientLookupBusy,setRecipientLookupBusy]=useState(false),[title,setTitle]=useState(''),[message,setMessage]=useState(''),[category,setCategory]=useState('general'),[busy,setBusy]=useState(false),[markingAll,setMarkingAll]=useState(false),[unreadOnly,setUnreadOnly]=useState(false),[search,setSearch]=useState(''),[categoryFilter,setCategoryFilter]=useState('all'),[error,setError]=useState(''),[notice,setNotice]=useState(''),[hasMore,setHasMore]=useState(false);
 const load=useCallback(async()=>{
  const seq=++requestSeq.current;loadMoreBusy.current=false;
  if(!supabase){setError('Notifications are unavailable until Supabase is configured.');setItems([]);setHasMore(false);return;}
  setBusy(true);setError('');
  try{
   let rows:Notice[]=[];
   if(isAdmin){
    const{data,error:loadError}=await supabase.rpc('admin_list_member_notifications_keyset_page',{p_limit:PAGE_SIZE+1,p_cursor_created_at:null,p_cursor_id:null,p_category:categoryFilter});
    if(loadError)throw loadError;
    rows=(data??[]) as Notice[];
   }else{
    const{data:{user},error:userError}=await supabase.auth.getUser();
    if(userError||!user)throw new Error('Please sign in again to view your notifications.');
    let request=supabase.from('member_notifications').select('id,user_id,title,message,category,read_at,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).order('id',{ascending:false});
    if(unreadOnly)request=request.is('read_at',null);
    if(categoryFilter!=='all')request=request.eq('category',categoryFilter);
    const{data,error:loadError}=await request.limit(PAGE_SIZE+1);
    if(loadError)throw loadError;
    rows=(data??[]) as Notice[];
   }
   if(seq!==requestSeq.current)return;
   setItems(rows.slice(0,PAGE_SIZE));setHasMore(rows.length>PAGE_SIZE);
  }catch(e){if(seq===requestSeq.current)setError(e instanceof Error?e.message:'Notifications could not be loaded. Please retry.');}
  finally{if(seq===requestSeq.current)setBusy(false);}
 },[isAdmin,unreadOnly,categoryFilter]);
 const loadMore=useCallback(async()=>{
  if(!supabase||loadMoreBusy.current||busy||!hasMore)return;
  loadMoreBusy.current=true;const seq=requestSeq.current;setBusy(true);setError('');
  try{
   const cursor=items[items.length-1];if(!cursor){setHasMore(false);return;}let rows:Notice[]=[];
   if(isAdmin){
    const{data,error:loadError}=await supabase.rpc('admin_list_member_notifications_keyset_page',{p_limit:PAGE_SIZE+1,p_cursor_created_at:cursor.created_at,p_cursor_id:cursor.id,p_category:categoryFilter});
    if(loadError)throw loadError;
    rows=(data??[]) as Notice[];
   }else{
    const{data:{user},error:userError}=await supabase.auth.getUser();
    if(userError||!user)throw new Error('Please sign in again to view your notifications.');
    let request=supabase.from('member_notifications').select('id,user_id,title,message,category,read_at,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).order('id',{ascending:false});
    if(unreadOnly)request=request.is('read_at',null);
    if(categoryFilter!=='all')request=request.eq('category',categoryFilter);
    request=request.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`);
    const{data,error:loadError}=await request.limit(PAGE_SIZE+1);
    if(loadError)throw loadError;
    rows=(data??[]) as Notice[];
   }
   if(seq!==requestSeq.current)return;
   const known=new Set(items.map(item=>item.id));const pageIds=new Set<string>();const fresh:Notice[]=[];let duplicateFound=false;
   for(const item of rows){if(known.has(item.id)||pageIds.has(item.id)){duplicateFound=true;continue;}pageIds.add(item.id);fresh.push(item);}
   setItems(current=>[...current,...fresh.filter(item=>!current.some(existing=>existing.id===item.id)).slice(0,PAGE_SIZE)]);
   if(duplicateFound){setHasMore(false);setError('The notification inbox returned duplicate notification IDs. Refresh the inbox before loading more.');}
   else setHasMore(rows.length>PAGE_SIZE);
  }catch(e){if(seq===requestSeq.current)setError(e instanceof Error?e.message:'More notifications could not be loaded. Please retry.');}
  finally{if(seq===requestSeq.current){loadMoreBusy.current=false;setBusy(false);}}
 },[busy,hasMore,items,isAdmin,unreadOnly,categoryFilter]);
 useEffect(()=>{void load();return()=>{requestSeq.current++;loadMoreBusy.current=false;}},[load]);
 async function lookupRecipients(){
  if(!supabase||!isAdmin||recipientLookupBusy)return;const term=recipientSearch.trim();if(term.length<2){setError('Enter at least 2 characters to search members.');return;}const seq=++recipientLookupSeq.current;setRecipientLookupBusy(true);setError('');setNotice('');setRecipientOptions([]);setUserId('');
  try{const{data,error:lookupError}=await supabase.rpc('admin_lookup_notification_recipients',{p_search:term});if(seq!==recipientLookupSeq.current)return;if(lookupError)throw lookupError;const rows=(data??[]) as {user_id:string;member_code:string;display_name:string;phone:string}[];setRecipientOptions(rows);if(rows.length===0)setNotice('No matching Main ID members were found.');}
  catch(e){if(seq===recipientLookupSeq.current)setError(e instanceof Error?e.message:'Member lookup failed. Please retry.');}
  finally{if(seq===recipientLookupSeq.current)setRecipientLookupBusy(false);}
 }
 async function send(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(!supabase||busy)return;const target=userId.trim();
  if(!recipientOptions.some(member=>member.user_id===target)){setError('Search for and select a member before sending.');return;}
  if(title.trim().length<3||title.trim().length>120||message.trim().length<5||message.trim().length>2000){setError('Title must be 3–120 characters and message 5–2,000 characters.');return;}
  setBusy(true);setError('');setNotice('');
  try{const fingerprint=JSON.stringify([target,title.trim(),message.trim(),category]);if(!sendKey.current||sendKey.current.fingerprint!==fingerprint){const bytes=new Uint8Array(16);window.crypto.getRandomValues(bytes);sendKey.current={key:Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join(''),fingerprint};}const{data:sendResult,error:sendError}=await supabase.rpc('admin_send_member_notification',{p_user_id:target,p_title:title.trim(),p_message:message.trim(),p_category:category,p_idempotency_key:sendKey.current.key});if(sendError)throw sendError;sendKey.current=null;setUserId('');setRecipientSearch('');setRecipientOptions([]);setTitle('');setMessage('');setNotice((sendResult as {replayed?:boolean}|null)?.replayed?'This notification request was already delivered.':'Notification sent to the selected member.');await load();}
  catch(e){setError(e instanceof Error?e.message:'Notification could not be sent. Please retry.');}
  finally{setBusy(false);}
 }
 async function markRead(id:string){
  if(!supabase||markReadBusy.current.has(id))return;markReadBusy.current.add(id);const readAt=new Date().toISOString();
  try{
   let request=supabase.from('member_notifications').update({read_at:readAt}).eq('id',id).is('read_at',null);
   if(!isAdmin){const{data:{user},error:userError}=await supabase.auth.getUser();if(userError||!user)throw new Error('Please sign in again to update your notifications.');request=request.eq('user_id',user.id);}
   const{error:updateError}=await request;if(updateError)throw updateError;
   setItems(rows=>rows.map(row=>row.id===id?{...row,read_at:readAt}:row));
  }catch(e){setError(e instanceof Error?e.message:'Notification could not be marked as read. Please retry.');}
  finally{markReadBusy.current.delete(id);}
 }
 async function markAllRead(){
  if(!supabase||markAllBusy.current||markingAll||unread===0)return;markAllBusy.current=true;setMarkingAll(true);setError('');setNotice('');const readAt=new Date().toISOString();
  try{
   const{data:{user},error:userError}=await supabase.auth.getUser();if(userError||!user)throw new Error('Please sign in again to update your notifications.');
   const{error:updateError}=await supabase.from('member_notifications').update({read_at:readAt}).eq('user_id',user.id).is('read_at',null);if(updateError)throw updateError;
   setItems(rows=>rows.map(row=>row.read_at?row:{...row,read_at:readAt}));setNotice('All unread notifications have been marked as read.');
  }catch(e){setError(e instanceof Error?e.message:'Unread notifications could not be updated. Please retry.');}
  finally{markAllBusy.current=false;setMarkingAll(false);}
 }
 const unread=items.filter(item=>!item.read_at).length;
 const visibleItems=items.filter(item=>(!unreadOnly||isAdmin||!item.read_at)&&(categoryFilter==='all'||item.category===categoryFilter)&&(!search.trim()||[item.title,item.message,item.category].some(value=>value.toLowerCase().includes(search.trim().toLowerCase()))));
 const categories=['general','account','support','security'];
 return <section className="accountSection" style={{display:'block',maxWidth:980,margin:'0 auto'}}>
  <h3><Bell size={20}/> {isAdmin?'Member Notifications':'Notifications'}</h3>
  <p className="memberModuleHint">{isAdmin?'Send an in-app notification to one member by searching their Main ID, name or mobile number.':'Your recent BiddWorld account and support notifications.'}</p>
  {error&&<div className="notice" role="alert">{error}</div>}{notice&&<div className="notice" role="status">{notice}</div>}
  {isAdmin&&<form className="memberWithdrawalForm" onSubmit={send}>
   <label>Find Member by Main ID, name or mobile<input value={recipientSearch} onChange={e=>{recipientLookupSeq.current+=1;setRecipientLookupBusy(false);setRecipientSearch(e.target.value);setRecipientOptions([]);setUserId("");}} placeholder="Enter Member ID, name or mobile number"/></label>
   <button className="outline small" type="button" disabled={recipientLookupBusy||recipientSearch.trim().length<2} onClick={()=>void lookupRecipients()}>{recipientLookupBusy?"Searching…":"Search members"}</button>
   {recipientOptions.length>0&&<label>Select recipient<select required value={userId} onChange={e=>setUserId(e.target.value)}><option value="">Choose a member</option>{recipientOptions.map(member=><option key={member.user_id} value={member.user_id}>{member.member_code} · {member.display_name||"Name not provided"} · {member.phone||"No mobile"}</option>)}</select></label>}
   <label>Title<input required minLength={3} maxLength={120} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Notification title"/></label>
   <label>Message<textarea required minLength={5} maxLength={2000} rows={3} value={message} onChange={e=>setMessage(e.target.value)} placeholder="Write a clear account notification"/></label>
   <label>Category<select value={category} onChange={e=>setCategory(e.target.value)}><option value="general">General</option><option value="account">Account</option><option value="support">Support</option><option value="security">Security</option></select></label>
   <button className="primary" disabled={busy} type="submit"><Send size={15}/> Send notification</button>
  </form>}
  <div className="memberReportHeading"><h4>{isAdmin?'Recent notifications':`Inbox · ${unread} unread shown on this page`} ({items.length}{hasMore?' loaded':''})</h4><div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{!isAdmin&&<><button className="outline small" type="button" onClick={()=>setUnreadOnly(value=>!value)}>{unreadOnly?'Show all loaded':'Show unread only'}</button><button className="outline small" type="button" onClick={()=>void markAllRead()} disabled={markingAll||unread===0}>{markingAll?'Updating…':'Mark all read'}</button></>}<button className="outline small" type="button" onClick={()=>void load()} disabled={busy}><RefreshCw size={14}/> Refresh</button></div></div>
  <div className="sponsorAdminForm" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:10,marginBottom:12}}><label>Search loaded notifications<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Title or message"/></label><label>Category<select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)}><option value="all">All categories</option>{categories.map(value=><option key={value} value={value}>{value}</option>)}</select></label><button className="outline small" type="button" onClick={()=>{setSearch('');setCategoryFilter('all');setUnreadOnly(false)}}>Clear inbox filters</button><small>{visibleItems.length} matching loaded notifications</small></div>
  {busy&&items.length===0?<div className="empty">Loading notifications…</div>:items.length===0?<div className="empty">No notifications yet.</div>:visibleItems.length===0?<div className="empty">No unread notifications among the loaded records.</div>:<div className="activationList">{visibleItems.map(item=><article key={item.id} style={{display:'block',opacity:item.read_at ? 0.65 : 1}}>
   <div style={{display:'flex',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}><b>{item.title}</b><small>{item.category.toUpperCase()} · {new Date(item.created_at).toLocaleString('en-IN')}</small></div>
   <p style={{whiteSpace:'pre-wrap'}}>{item.message}</p>
   {isAdmin&&<small>Recipient: {item.recipient_member_code||'No Main ID'} · {item.recipient_name||'Member'}</small>}
   {!isAdmin&&!item.read_at&&<button className="outline small" type="button" onClick={()=>void markRead(item.id)}><CheckCheck size={14}/> Mark as read</button>}
   {item.read_at&&<small>Read {new Date(item.read_at).toLocaleString('en-IN')}</small>}
  </article>)}</div>}
  {hasMore&&<button className="outline small" type="button" onClick={()=>void loadMore()} disabled={busy}>{busy?'Loading…':'Load 100 more notifications'}</button>}
  <small className="memberModuleState">In-app inbox only. Email, SMS and push delivery are not configured. Records load 100 at a time.</small>
 </section>;
}

import {useCallback,useEffect,useRef,useState} from 'react';
import {MessageCircle,Send,RefreshCw,ShieldCheck} from 'lucide-react';
import {supabase} from '../lib/supabase';
import {csvDocument} from '../lib/csv';

type Ticket={id:string;user_id:string;subject:string;message:string;status:'open'|'in_progress'|'resolved'|'closed';admin_response:string|null;created_at:string;updated_at:string};
const PAGE_SIZE=100;

export default function Support({isAdmin=false}:{isAdmin?:boolean}){
 const requestSeq=useRef(0),loadMoreBusy=useRef(false),submitBusy=useRef(false),saveBusy=useRef(new Set<string>()),submitKey=useRef(''),submitKeyPayload=useRef('');
 const [tickets,setTickets]=useState<Ticket[]>([]);
 const [subject,setSubject]=useState('');
 const [message,setMessage]=useState('');
 const [response,setResponse]=useState<Record<string,string>>({});
 const [status,setStatus]=useState<Record<string,Ticket['status']>>({});
 const [busy,setBusy]=useState(false);
 const [saving,setSaving]=useState('');
 const [notice,setNotice]=useState('');
 const [error,setError]=useState('');
 const [hasMore,setHasMore]=useState(false);
 const [search,setSearch]=useState('');
 const [statusFilter,setStatusFilter]=useState<'all'|Ticket['status']>('all');
 const [exportBusy,setExportBusy]=useState(false);
 const [exportMessage,setExportMessage]=useState('');

 const load=useCallback(async()=>{
  const seq=++requestSeq.current;loadMoreBusy.current=false;
  if(!supabase){setError('Support is unavailable until the BiddWorld database is configured.');setTickets([]);setHasMore(false);return;}
  setBusy(true);setError('');
  try{
   let request=supabase.from('support_tickets').select('id,user_id,subject,message,status,admin_response,created_at,updated_at').order('updated_at',{ascending:false}).order('id',{ascending:false});
   if(!isAdmin){const{data:{user},error:userError}=await supabase.auth.getUser();if(userError||!user)throw new Error('Please sign in again to view your support requests.');request=request.eq('user_id',user.id);}if(statusFilter!=='all')request=request.eq('status',statusFilter);
   const {data,error:loadError}=await request.range(0,PAGE_SIZE-1);
   if(loadError)throw loadError;
   if(seq!==requestSeq.current)return;
   const rows=(data??[]) as Ticket[];
   setTickets(rows);setHasMore(rows.length===PAGE_SIZE);
   setStatus(Object.fromEntries(rows.map(row=>[row.id,row.status])));
   setResponse(Object.fromEntries(rows.map(row=>[row.id,row.admin_response??''])));
  }catch(e){if(seq===requestSeq.current)setError(e instanceof Error?e.message:'Support requests could not be loaded. Please retry.');}
  finally{if(seq===requestSeq.current)setBusy(false);}
 },[isAdmin,statusFilter]);
 const loadMore=useCallback(async()=>{
  if(!supabase||loadMoreBusy.current||busy||!hasMore)return;
  loadMoreBusy.current=true;const seq=requestSeq.current;setBusy(true);setError('');
  try{
   const cursor=tickets[tickets.length-1];
   if(!cursor){setHasMore(false);return;}
   let request=supabase.from('support_tickets').select('id,user_id,subject,message,status,admin_response,created_at,updated_at').order('updated_at',{ascending:false}).order('id',{ascending:false});
   if(!isAdmin){const{data:{user},error:userError}=await supabase.auth.getUser();if(userError||!user)throw new Error('Please sign in again to view your support requests.');request=request.eq('user_id',user.id);}if(statusFilter!=='all')request=request.eq('status',statusFilter);
   request=request.or(`updated_at.lt.${cursor.updated_at},and(updated_at.eq.${cursor.updated_at},id.lt.${cursor.id})`);
   const {data,error:loadError}=await request.limit(PAGE_SIZE);
   if(loadError)throw loadError;
   if(seq!==requestSeq.current)return;
   const rows=(data??[]) as Ticket[];
   const known=new Set(tickets.map(ticket=>ticket.id));const pageIds=new Set<string>();const fresh:Ticket[]=[];let duplicateFound=false;
   for(const ticket of rows){if(known.has(ticket.id)||pageIds.has(ticket.id)){duplicateFound=true;continue;}pageIds.add(ticket.id);fresh.push(ticket);}
   setTickets(current=>[...current,...fresh.filter(ticket=>!current.some(existing=>existing.id===ticket.id))]);
   if(duplicateFound){setHasMore(false);setError('The support queue returned duplicate ticket IDs. Refresh the list before loading more.');}else setHasMore(rows.length===PAGE_SIZE);
   setStatus(current=>({...current,...Object.fromEntries(rows.map(row=>[row.id,row.status]))}));
   setResponse(current=>({...current,...Object.fromEntries(rows.map(row=>[row.id,row.admin_response??'']))}));
  }catch(e){if(seq===requestSeq.current)setError(e instanceof Error?e.message:'More support requests could not be loaded. Please retry.');}
  finally{if(seq===requestSeq.current){loadMoreBusy.current=false;setBusy(false);}}
 },[busy,hasMore,tickets.length,isAdmin,statusFilter]);
 useEffect(()=>{void load();return()=>{requestSeq.current++;loadMoreBusy.current=false;}},[load]);

 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(!supabase||busy||submitBusy.current)return;
  if(subject.trim().length<4||subject.trim().length>120){setError('Subject must contain 4–120 characters.');return;}
  if(message.trim().length<10||message.trim().length>5000){setError('Describe your issue in 10–5,000 characters.');return;}
  submitBusy.current=true;setBusy(true);setError('');setNotice('');
  try{
   const {data:{user},error:userError}=await supabase.auth.getUser();
   if(userError||!user)throw new Error('Please sign in again to submit a support request.');
   const submissionPayload=JSON.stringify([subject.trim(),message.trim()]);
   if(submitKeyPayload.current!==submissionPayload){submitKey.current='';submitKeyPayload.current=submissionPayload;}
   if(!submitKey.current){const bytes=new Uint8Array(16);window.crypto.getRandomValues(bytes);submitKey.current=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');}
   const {data:submitResult,error:insertError}=await supabase.rpc('member_submit_support_ticket',{p_subject:subject.trim(),p_message:message.trim(),p_idempotency_key:submitKey.current});
   if(insertError)throw insertError;
   submitKey.current='';submitKeyPayload.current='';setSubject('');setMessage('');setNotice((submitResult as {replayed?:boolean}|null)?.replayed?'Your earlier support request was already recorded.':'Your support request has been submitted.');
   await load();
  }catch(e){setError(e instanceof Error?e.message:'Your support request could not be submitted. Please retry.');}
  finally{submitBusy.current=false;setBusy(false);}
 }
 async function exportTickets(){
  if(!supabase||exportBusy)return;setExportBusy(true);setExportMessage('');
  try{
   let userId:string|undefined;
   if(!isAdmin){const{data:{user},error:userError}=await supabase.auth.getUser();if(userError||!user)throw new Error('Please sign in again to export your support requests.');userId=user.id;}
   const all:Ticket[]=[];const seenPages=new Set<string>(),seenIds=new Set<string>();
   let cursor:Pick<Ticket,'updated_at'|'id'>|null=null;
   for(let pages=0;pages<10000;pages++){
    let request=supabase.from('support_tickets').select('id,user_id,subject,message,status,admin_response,created_at,updated_at').order('updated_at',{ascending:false}).order('id',{ascending:false});
    if(userId)request=request.eq('user_id',userId);if(statusFilter!=='all')request=request.eq('status',statusFilter);
    if(cursor)request=request.or(`updated_at.lt.${cursor.updated_at},and(updated_at.eq.${cursor.updated_at},id.lt.${cursor.id})`);
    const{data,error:loadError}=await request.limit(500);if(loadError)throw loadError;
    const batch=(data??[]) as Ticket[];
    if(batch.length===500){
     const fingerprint=JSON.stringify(batch.map(ticket=>ticket.id));
     if(seenPages.has(fingerprint))throw new Error('The support export repeated a page. Export stopped to avoid duplicate or incomplete records. Please retry.');
     seenPages.add(fingerprint);
    }
    for(const ticket of batch){
     if(seenIds.has(ticket.id))throw new Error('The support export returned duplicate ticket IDs. Export stopped to avoid an inaccurate CSV. Please retry.');
     seenIds.add(ticket.id);all.push(ticket);
    }
    if(batch.length<500)break;
    const last=batch[batch.length-1];cursor={updated_at:last.updated_at,id:last.id};
    if(pages===9999)throw new Error('The support export reached the 5,000,000-row safety limit. Narrow the status filter and retry.');
   }
   const q=search.trim().toLowerCase();const matched=all.filter(ticket=>!q||[ticket.subject,ticket.message,ticket.admin_response??''].some(value=>value.toLowerCase().includes(q)));
   if(!matched.length){setExportMessage('No matching support requests are available to export.');return;}
   const rows=[['Ticket ID','Member User ID','Subject','Message','Status','Admin Response','Created At','Updated At'],...matched.map(ticket=>[ticket.id,ticket.user_id,ticket.subject,ticket.message,ticket.status,ticket.admin_response??'',ticket.created_at,ticket.updated_at])];
   const url=URL.createObjectURL(new Blob([csvDocument(rows)],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=isAdmin?'biddworld-support-queue.csv':'biddworld-my-support-requests.csv';document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
   setExportMessage('Exported '+matched.length+' support requests matching the current filters.');
  }catch(e){setExportMessage(e instanceof Error?e.message:'Support requests could not be exported. Please retry.');}
  finally{setExportBusy(false);}
 }
 async function saveTicket(id:string){
  if(!supabase||saveBusy.current.has(id))return;
  const nextStatus=status[id]??'open';
  const nextResponse=(response[id]??'').trim();
  if(nextResponse.length>5000){setError('Admin response must be 5,000 characters or fewer.');return;}
  saveBusy.current.add(id);setSaving(id);setError('');setNotice('');
  try{
   const {error:updateError}=await supabase.rpc('admin_update_support_ticket',{p_ticket_id:id,p_status:nextStatus,p_admin_response:nextResponse||null});
   if(updateError)throw updateError;
   setNotice('Support ticket updated.');await load();
  }catch(e){setError(e instanceof Error?e.message:'Support ticket could not be updated. Please retry.');}
  finally{saveBusy.current.delete(id);setSaving(current=>current===id?'':current);}
 }
 const date=(value:string)=>new Date(value).toLocaleString('en-IN');
 const visibleTickets=tickets.filter(ticket=>(statusFilter==='all'||ticket.status===statusFilter)&&(!search.trim()||[ticket.subject,ticket.message,ticket.admin_response??''].some(value=>value.toLowerCase().includes(search.trim().toLowerCase()))));
 return <section className="accountSection" style={{display:'block',maxWidth:980,margin:'0 auto'}}>
  <h3><MessageCircle size={20}/> {isAdmin?'Member Support Queue':'Support & Help'}</h3>
  <p className="memberModuleHint">{isAdmin?'Review member requests and record a status and response.':'Send a private request to the BiddWorld support team and follow its status here.'}</p>
  {error&&<div className="notice" role="alert">{error}</div>}{notice&&<div className="notice" role="status">{notice}</div>}
  {!isAdmin&&<form className="memberWithdrawalForm" onSubmit={submit}>
   <label>Subject<input required minLength={4} maxLength={120} value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Briefly describe the issue"/></label>
   <label>Message<textarea required minLength={10} maxLength={5000} rows={5} value={message} onChange={e=>setMessage(e.target.value)} placeholder="Include the details needed to help resolve your issue."/></label>
   <button className="primary" type="submit" disabled={busy||!supabase}><Send size={16}/> {busy?'Submitting…':'Submit support request'}</button>
  </form>}
  <div className="memberReportHeading"><h4>{isAdmin?'Recent member requests':'My support requests'} ({tickets.length}{hasMore?' loaded':''})</h4><div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button className="outline small" type="button" onClick={()=>void exportTickets()} disabled={exportBusy}><RefreshCw size={14}/>{exportBusy?'Preparing…':'Export Full CSV'}</button><button className="outline small" type="button" onClick={()=>void load()} disabled={busy}><RefreshCw size={14}/> Refresh</button></div></div>{exportMessage&&<p className="memberModuleState" role="status">{exportMessage}</p>}
  <div className="sponsorAdminForm" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:10,marginBottom:12}}><label>Search loaded requests<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Subject or message"/></label><label>Filter by status<select value={statusFilter} onChange={e=>setStatusFilter(e.target.value as typeof statusFilter)}><option value="all">All statuses</option><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select></label></div>
  <div className="memberModuleHint">Showing {visibleTickets.length} matching requests from {tickets.length} loaded records. Status is filtered on the server before pagination; text search applies to loaded records.</div>
  {busy&&tickets.length===0?<div className="empty">Loading support requests…</div>:tickets.length===0?<div className="empty">No support requests found.</div>:visibleTickets.length===0?<div className="empty">No loaded support requests match these filters.</div>:<div className="activationList">{visibleTickets.map(ticket=><article key={ticket.id} style={{display:'block'}}>
   <div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><b>{ticket.subject}</b><span className="protected">{ticket.status.replace('_',' ').toUpperCase()}</span></div>
   {isAdmin&&<small>Ticket {ticket.id.slice(0,8).toUpperCase()} · Member {ticket.user_id.slice(0,8)} </small>}
   <p style={{whiteSpace:'pre-wrap'}}>{ticket.message}</p><small>Submitted: {date(ticket.created_at)} · Updated: {date(ticket.updated_at)}</small>
   {ticket.admin_response&&<div className="notice"><b>Support response</b><p style={{whiteSpace:'pre-wrap'}}>{ticket.admin_response}</p></div>}
   {isAdmin&&<div className="sponsorAdminForm" style={{display:'grid',gap:8,marginTop:12}}>
    <label>Status<select value={status[ticket.id]??ticket.status} onChange={e=>setStatus(current=>({...current,[ticket.id]:e.target.value as Ticket['status']}))}><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select></label>
    <label>Response<textarea rows={3} maxLength={5000} value={response[ticket.id]??''} onChange={e=>setResponse(current=>({...current,[ticket.id]:e.target.value}))} placeholder="Reply to the member"/></label>
    <button className="primary small" type="button" disabled={saving!==''} onClick={()=>void saveTicket(ticket.id)}><ShieldCheck size={15}/>{saving===ticket.id?'Saving…':'Save response & status'}</button>
   </div>}
  </article>)}</div>}
  {hasMore&&<button className="outline small" type="button" onClick={()=>void loadMore()} disabled={busy}>{busy?'Loading…':'Load 100 more requests'}</button>}
  <small className="memberModuleState">Privacy: members can access only their own requests. Admin access is checked by database policies. Records load 100 at a time.</small>
 </section>;
}

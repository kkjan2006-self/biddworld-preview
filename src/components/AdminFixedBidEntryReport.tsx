import {useEffect,useRef,useState} from 'react';
import {supabase} from '../lib/supabase';
import {csvDocument} from '../lib/csv';

type FixedBidEntryRow={
 entry_id:string;campaign_id:string;campaign_title:string;campaign_status:string;
 member_code:string;member_name:string|null;entry_amount:number;status:string;created_at:string;
};
type Filters={search:string;status:string;from:string;to:string};
const PAGE_SIZE=100;
function boundary(date:string,end:boolean):string|null{
 if(!date)return null;
 const value=new Date(date+(end?'T23:59:59.999':'T00:00:00'));
 return Number.isNaN(value.getTime())?null:value.toISOString();
}
function appendUnique(current:FixedBidEntryRow[],next:FixedBidEntryRow[]):FixedBidEntryRow[]{
 const seen=new Set(current.map(row=>row.entry_id));
 return [...current,...next.filter(row=>!seen.has(row.entry_id))];
}
export default function AdminFixedBidEntryReport(){
 const [search,setSearch]=useState(''),[status,setStatus]=useState('all'),[from,setFrom]=useState(''),[to,setTo]=useState('');
 const [applied,setApplied]=useState<Filters>({search:'',status:'all',from:'',to:''});
 const [rows,setRows]=useState<FixedBidEntryRow[]>([]),[hasMore,setHasMore]=useState(false);
 const [loading,setLoading]=useState(false),[loadingMore,setLoadingMore]=useState(false),[exporting,setExporting]=useState(false),[error,setError]=useState('');
 const request=useRef(0),pageLock=useRef(false),cursorRef=useRef<{created_at:string;id:string}|null>(null);
 async function loadPage(reset:boolean,filters:Filters){
  if(!supabase){setError('Admin database connection is unavailable.');return;}
  if(!reset&&pageLock.current)return;
  if(reset){pageLock.current=false;cursorRef.current=null;}else pageLock.current=true;
  const requestId=++request.current,cursor=reset?null:cursorRef.current;
  if(reset){setLoading(true);setLoadingMore(false);}else setLoadingMore(true);
  setError('');
  try{
   const{data,error:rpcError}=await supabase.rpc('admin_list_fixed_bid_entries_cursor_page',{
    p_search:filters.search||null,p_status:filters.status==='all'?null:filters.status,
    p_from:boundary(filters.from,false),p_to:boundary(filters.to,true),
    p_limit:PAGE_SIZE+1,p_after_created_at:cursor?.created_at??null,p_after_id:cursor?.id??null
   });
   if(rpcError)throw rpcError;
   if(requestId!==request.current)return;
   const fetched=(data??[]) as FixedBidEntryRow[];
   const batch=fetched.slice(0,PAGE_SIZE);
   cursorRef.current=batch.length?{created_at:batch[batch.length-1].created_at,id:batch[batch.length-1].entry_id}:cursor;
   const added=reset?batch.length:batch.filter(row=>!rows.some(existing=>existing.entry_id===row.entry_id)).length;
   setRows(current=>reset?batch:appendUnique(current,batch));
   if(fetched.length>PAGE_SIZE&&added===0){
    setHasMore(false);
    setError('The Fixed Bid entry report returned a repeated page. Refresh the report before loading more.');
   }else setHasMore(fetched.length>PAGE_SIZE);
  }catch(e){
   if(requestId===request.current)setError(e instanceof Error?e.message:'Fixed Bid entry report could not be loaded. Please retry.');
  }finally{
   if(requestId===request.current){setLoading(false);setLoadingMore(false);pageLock.current=false;}
  }
 }
 useEffect(()=>{
  void loadPage(true,{search:'',status:'all',from:'',to:''});
  return()=>{request.current+=1;};
 },[]);
 async function exportAll(){
  if(!supabase||exporting)return;
  setExporting(true);setError('');
  try{
   const all:FixedBidEntryRow[]=[];
   const seenIds=new Set<string>(),seenPages=new Set<string>();
   let cursor:{created_at:string;id:string}|null=null;
   for(let pages=0;;){
    pages+=1;
    if(pages>10000)throw new Error('The report exceeds the safe export limit.');
    const{data,error:rpcError}=await supabase.rpc('admin_list_fixed_bid_entries_cursor_page',{
     p_search:applied.search||null,p_status:applied.status==='all'?null:applied.status,
     p_from:boundary(applied.from,false),p_to:boundary(applied.to,true),
     p_limit:PAGE_SIZE,p_after_created_at:cursor?.created_at??null,p_after_id:cursor?.id??null
    });
    if(rpcError)throw rpcError;
    const batch=(data??[]) as FixedBidEntryRow[];
    if(batch.length===PAGE_SIZE){
     const fingerprint=JSON.stringify(batch.map(row=>row.entry_id));
     if(seenPages.has(fingerprint))throw new Error('The report repeated a page. Export stopped to avoid duplicate or incomplete records. Please retry.');
     seenPages.add(fingerprint);
    }
    for(const row of batch){
     if(seenIds.has(row.entry_id))throw new Error('The report returned duplicate records. Export stopped to avoid an inaccurate CSV. Please retry.');
     seenIds.add(row.entry_id);all.push(row);
    }
    if(batch.length<PAGE_SIZE)break;
    cursor={created_at:batch[batch.length-1].created_at,id:batch[batch.length-1].entry_id};
   }
   const csv=csvDocument([
    ['Entry ID','Campaign ID','Campaign','Campaign Status','Member Main ID','Member Name','Entry Amount (INR)','Entry Status','Created At'],
    ...all.map(row=>[row.entry_id,row.campaign_id,row.campaign_title,row.campaign_status,row.member_code,row.member_name||'',row.entry_amount,row.status,row.created_at])
   ]);
   const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));
   const anchor=document.createElement('a');anchor.href=url;anchor.download='biddworld-fixed-bid-entries-complete.csv';
   document.body.appendChild(anchor);anchor.click();anchor.remove();URL.revokeObjectURL(url);
  }catch(e){setError(e instanceof Error?e.message:'Fixed Bid entry CSV export failed. Please retry.');}
  finally{setExporting(false);}
 }
 function applyFilters(){const filters={search:search.trim(),status,from,to};setApplied(filters);void loadPage(true,filters);}
 return <section className="sponsorAdmin">
  <h4>8. Fixed Bid Entries</h4>
  <p>Admin-only campaign participation history with server-side search, status/date filters, pagination and complete CSV export. Idempotency keys are never exposed.</p>
  <div className="sponsorAdminForm">
   <input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Campaign, Main ID or member name"/>
   <select value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All statuses</option><option value="submitted">Submitted</option><option value="accepted">Accepted</option><option value="voided">Voided</option><option value="cancelled">Cancelled</option></select>
   <label>From <input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label>
   <label>To <input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label>
   <button className="secondary small" onClick={applyFilters} disabled={loading}>Apply filters</button>
   <button className="secondary small" onClick={()=>void exportAll()} disabled={exporting}>{exporting?'Preparing CSV…':'Export Complete Fixed Bid Entries CSV'}</button>
  </div>
  {error&&<p role="alert">{error} <button className="secondary small" onClick={()=>void loadPage(true,applied)}>Retry</button></p>}
  {loading?<p>Loading Fixed Bid entries…</p>:rows.length===0?<p>No Fixed Bid entries match these filters.</p>:
   <div className="referralList">{rows.map(row=><div className="referralRow" key={row.entry_id}>
    <div><b>{row.campaign_title}</b><small>{row.member_code} · {row.member_name||'Member'} · {new Date(row.created_at).toLocaleString()}</small></div>
    <div><b>₹{Number(row.entry_amount||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}</b><small>{row.status} · Campaign {row.campaign_status}</small></div>
   </div>)}</div>}
  <div className="sponsorAdminForm"><small>{rows.length} entry records loaded</small>
   {hasMore&&<button className="secondary small" onClick={()=>void loadPage(false,applied)} disabled={loadingMore}>{loadingMore?'Loading…':'Load more entries'}</button>}
  </div>
 </section>;
}

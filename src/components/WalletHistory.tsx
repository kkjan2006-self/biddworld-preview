import { useEffect, useRef, useState } from 'react';
import { History, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { money } from '../lib/format';
import { csvDocument } from '../lib/csv';

type Tx={id:string;transaction_type:string;direction:string;amount:number;balance_after:number;description:string|null;created_at:string;wallet_account:{wallet_type:string;currency:string}[];};
export default function WalletHistory(){
 const [userId,setUserId]=useState<string|null>(null);
 const [rows,setRows]=useState<Tx[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [kind,setKind]=useState('all');
 const [walletKind,setWalletKind]=useState('all');
 const [transactionType,setTransactionType]=useState('all');
 const [search,setSearch]=useState('');
 const [dateFrom,setDateFrom]=useState('');
 const [dateTo,setDateTo]=useState('');
 const [refresh,setRefresh]=useState(0);
 const [page,setPage]=useState(0);
 const [hasMore,setHasMore]=useState(false);
 const [loadingMore,setLoadingMore]=useState(false);
 const [retryPage,setRetryPage]=useState<number|null>(null);
 const [retryRequest,setRetryRequest]=useState(0);
 const [exportBusy,setExportBusy]=useState(false);
 const [exportMessage,setExportMessage]=useState('');
 const loadMoreBusy=useRef(false),userScopeRef=useRef<string|null>(null),pageCursor=useRef<{created_at:string;id:string}|null>(null);

 useEffect(()=>{
  if(!supabase){setLoading(false);return;}
  let active=true;let authEventObserved=false;
  const applyUserScope=(nextUserId:string|null)=>{
   if(userScopeRef.current!==nextUserId){userScopeRef.current=nextUserId;pageCursor.current=null;setPage(0);setRetryPage(null);setRows([]);setHasMore(false);setError('');}
   setUserId(nextUserId);
  };
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
   authEventObserved=true;if(active)applyUserScope(session?.user?.id??null);
  });
  void supabase.auth.getUser().then(({data:{user},error})=>{if(active&&!authEventObserved){if(error)throw error;applyUserScope(user?.id??null);}}).catch(()=>{if(active&&!authEventObserved)setError('Your sign-in session could not be verified. Please sign in again.');});
  return()=>{active=false;subscription.unsubscribe();};
 },[]);

 useEffect(()=>{
  let active=true;
  if(page===0){loadMoreBusy.current=false;pageCursor.current=null;setRetryPage(null);}
  if(page===0){setRows([]);setLoading(true);}else setLoadingMore(true);setError('');
  async function load(){
   if(!supabase||!userId){if(active){loadMoreBusy.current=false;setLoading(false);setLoadingMore(false);}return;}
   try{
    const {data:profile,error:pError}=await supabase.from('profiles').select('main_member_id').eq('id',userId).maybeSingle();
    if(!active)return;
    if(pError||!profile?.main_member_id)throw new Error('Sign in with an account linked to a Main ID to view transactions.');
    let query=supabase.from('wallet_transactions').select('id,transaction_type,direction,amount,balance_after,description,created_at,wallet_account:wallet_accounts(wallet_type,currency)').eq('member_id',profile.main_member_id).order('created_at',{ascending:false}).order('id',{ascending:false});
    const cursor=pageCursor.current;
    if(page>0&&cursor)query=query.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`);
    const {data,error:qError}=await query.limit(100);
    if(!active)return;
    if(qError)throw qError;
    const batch=(data??[]) as Tx[];let added=batch.length;
    if(batch.length){const last=batch[batch.length-1];pageCursor.current={created_at:last.created_at,id:last.id};}
    setRows(current=>{if(page===0)return batch;const known=new Set(current.map(row=>row.id));const fresh=batch.filter(row=>!known.has(row.id));added=fresh.length;return [...current,...fresh];});setHasMore(batch.length===100&&(page===0||added>0));setRetryPage(null);
   }catch(e){if(active){if(page>0)setRetryPage(page);setError(e instanceof Error?e.message:'Transaction history could not be loaded. Please retry.');}}
   finally{if(active){loadMoreBusy.current=false;setLoading(false);setLoadingMore(false);}}
  }
  void load();return()=>{active=false;};
 },[userId,refresh,page,retryRequest]);

 function loadNextPage(){if(loadMoreBusy.current||loading||(retryPage===null&&!hasMore))return;loadMoreBusy.current=true;if(retryPage!==null){setRetryRequest(current=>current+1);return;}setPage(current=>current+1);}

 const invalidDateRange=Boolean(dateFrom&&dateTo&&dateFrom>dateTo);
 const transactionTypes=[...new Set(rows.map(r=>r.transaction_type).filter(Boolean))].sort();
 const matchesFilters=(r:Tx)=>{const day=r.created_at.slice(0,10),q=search.trim().toLowerCase();return (kind==='all'||r.direction===kind)&&(walletKind==='all'||r.wallet_account?.[0]?.wallet_type===walletKind)&&(transactionType==='all'||r.transaction_type===transactionType)&&(!dateFrom||day>=dateFrom)&&(!dateTo||day<=dateTo)&&(!q||[r.transaction_type,r.description??'',r.id].some(value=>value.toLowerCase().includes(q)));};
 const visible=invalidDateRange?[]:rows.filter(matchesFilters);
 async function exportTransactions(){if(!supabase||!userId||exportBusy)return;setExportBusy(true);setExportMessage('');try{const {data:profile,error:pError}=await supabase.from('profiles').select('main_member_id').eq('id',userId).maybeSingle();if(pError||!profile?.main_member_id)throw new Error('Member wallet scope could not be confirmed.');const all:Tx[]=[];const seen=new Set<string>();let cursor:{created_at:string;id:string}|null=null;let pages=0;for(;;){pages+=1;if(pages>10000)throw new Error('The wallet statement exceeded the safe export limit. Narrow the date range and retry.');let query=supabase.from('wallet_transactions').select('id,transaction_type,direction,amount,balance_after,description,created_at,wallet_account:wallet_accounts(wallet_type,currency)').eq('member_id',profile.main_member_id).order('created_at',{ascending:false}).order('id',{ascending:false});if(cursor)query=query.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`);const {data,error}=await query.limit(500);if(error)throw error;const batch=(data??[]) as Tx[];for(const row of batch){if(seen.has(row.id))throw new Error('The wallet statement returned duplicate transaction IDs. Export stopped to prevent an inaccurate CSV. Narrow the date range and retry.');seen.add(row.id);all.push(row);}if(batch.length<500)break;const last=batch[batch.length-1];cursor={created_at:last.created_at,id:last.id};}if(dateFrom&&dateTo&&dateFrom>dateTo)throw new Error('Start date must be on or before end date.');const matched=all.filter(matchesFilters);if(!matched.length){setExportMessage('No matching wallet transactions to export.');return;}const data=[['Date','Wallet','Type','Direction','Amount','Currency','Balance After','Description'],...matched.map(r=>[r.created_at,r.wallet_account?.[0]?.wallet_type||'',r.transaction_type,r.direction,String(r.amount),r.wallet_account?.[0]?.currency||'INR',String(r.balance_after),r.description||''])];const csv=csvDocument(data);const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='biddworld-complete-wallet-statement.csv';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);setExportMessage('Exported '+matched.length+' matching transactions.');}catch(e){setExportMessage(e instanceof Error?e.message:'Wallet statement export failed.');}finally{setExportBusy(false);}}
 return <section className="walletHistory">
  <div className="packageIntro"><span className="workspaceIcon"><History/></span><div><h3>Wallet transaction history</h3><p>Transactions across your Main ID wallets, loaded 100 at a time. Filter by wallet, direction, transaction type, description/reference or UTC date range. On-screen filters apply to loaded records; CSV export retrieves all matching records for your Main ID.</p></div></div>
  <div className="historyToolbar"><label>Search description / reference<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search loaded transactions"/></label><label>Transaction type <select value={transactionType} onChange={e=>setTransactionType(e.target.value)}><option value="all">All types</option>{transactionTypes.map(type=><option key={type} value={type}>{type.replaceAll("_"," ")}</option>)}</select></label><label>Direction <select value={kind} onChange={e=>setKind(e.target.value)}><option value="all">All transactions</option><option value="credit">Credits</option><option value="debit">Debits</option></select></label><label>Wallet <select value={walletKind} onChange={e=>setWalletKind(e.target.value)}><option value="all">Both wallets</option><option value="bid">Bid Wallet</option><option value="income">Main Wallet</option></select></label><label>From date (UTC)<input type="date" value={dateFrom} max={dateTo||undefined} onChange={e=>setDateFrom(e.target.value)}/></label><label>To date (UTC)<input type="date" value={dateTo} min={dateFrom||undefined} onChange={e=>setDateTo(e.target.value)}/></label><button className="outline small" onClick={()=>{loadMoreBusy.current=false;setRetryPage(null);setPage(0);setRefresh(v=>v+1)}}><RefreshCw size={14}/> Refresh</button><button className="outline small" onClick={()=>void exportTransactions()} disabled={exportBusy||invalidDateRange}>{exportBusy?'Preparing…':'Export Full CSV'}</button>{(dateFrom||dateTo)&&<button className="outline small" type="button" onClick={()=>{setDateFrom('');setDateTo('')}}>Clear dates</button>}<button className="outline small" type="button" onClick={()=>{setSearch('');setTransactionType('all');setKind('all');setWalletKind('all');setDateFrom('');setDateTo('')}}>Clear filters</button><small>{visible.length} matching loaded records</small></div>{invalidDateRange&&<small role="alert">Start date must be on or before end date.</small>}{exportMessage&&<small role="status">{exportMessage}</small>}
  {loading?<p className="packageState">Loading transactions…</p>:error?<div className="notice">{error}</div>:visible.length===0?<div className="empty">No wallet transactions found.</div>:
   <div className="transactionList">{visible.map(r=><article key={r.id}><div><b>{(r.transaction_type||'Transaction').replaceAll('_',' ')}</b><small>{r.description||'Wallet transaction'} · {new Date(r.created_at).toLocaleString()}</small></div><div className="transactionAmount"><b className={r.direction==='credit'?'credit':'debit'}>{r.direction==='credit'?'+':'−'}{money(Number(r.amount))}</b><small>Balance: {money(Number(r.balance_after))}</small></div></article>)}</div>}
  {!loading&&(hasMore||retryPage!==null)&&<button className="outline small" type="button" disabled={loadingMore} onClick={loadNextPage}>{loadingMore?"Loading…":retryPage!==null?"Retry failed page":"Load 100 more transactions"}</button>}
 </section>;
}

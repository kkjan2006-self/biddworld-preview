import {useEffect,useRef,useState} from 'react';
import {Gavel,Package,RefreshCw,ShieldCheck} from 'lucide-react';
import {supabase} from '../lib/supabase';
import {money} from '../lib/format';

type CampaignConfig={
 entry_amount?:number|string;
 winner_payment_amount?:number|string;
 max_entries_per_member?:number;
 max_entries_total?:number;
 winner_count?:number;
 starts_at?:string;
 ends_at?:string;
 refund_non_winners?:boolean;
};
type Campaign={
 id:string;title:string;description:string|null;status:string;created_at:string;
 configuration:CampaignConfig|null;
 product:{name:string;description:string|null;category:string|null;image_path:string|null}|null
};
const PAGE_SIZE=50;
const sampleFixedCampaigns:Campaign[]=[
{id:'sample-fixed-1',title:'Smartphone Mega Fixed Bid',description:'Sample campaign preview with entry amount, winner payment and campaign limits. Display-only; no entry or payment is processed.',status:'preview',created_at:new Date().toISOString(),configuration:{entry_amount:50,winner_payment_amount:12000,max_entries_per_member:3,max_entries_total:500,winner_count:1,starts_at:new Date(Date.now()-3600000).toISOString(),ends_at:new Date(Date.now()+5*86400000).toISOString(),refund_non_winners:false},product:{name:'5G Smartphone · 128 GB',description:'Sample product details.',category:'Electronics',image_path:null}},
{id:'sample-fixed-2',title:'Home Appliances Fixed Bid',description:'Sample campaign preview with a different product and entry limit. No payment or entry is processed.',status:'preview',created_at:new Date().toISOString(),configuration:{entry_amount:25,winner_payment_amount:6500,max_entries_per_member:5,max_entries_total:800,winner_count:2,starts_at:new Date(Date.now()-7200000).toISOString(),ends_at:new Date(Date.now()+7*86400000).toISOString(),refund_non_winners:true},product:{name:'Smart Mixer Grinder',description:'Sample product details.',category:'Home & Kitchen',image_path:null}},
{id:'sample-fixed-3',title:'Lifestyle Accessories Fixed Bid',description:'Sample campaign preview showing multiple winner slots and compact product details.',status:'preview',created_at:new Date().toISOString(),configuration:{entry_amount:30,winner_payment_amount:3000,max_entries_per_member:2,max_entries_total:300,winner_count:3,starts_at:new Date(Date.now()+86400000).toISOString(),ends_at:new Date(Date.now()+9*86400000).toISOString(),refund_non_winners:false},product:{name:'Premium Smartwatch',description:'Sample product details.',category:'Lifestyle',image_path:null}}
];
type CampaignStatus='all'|'scheduled'|'live'|'ended';
function productImageUrl(path:string|null|undefined){if(!path)return '';if(/^https?:\/\//i.test(path))return path;return supabase?.storage.from('product-media').getPublicUrl(path).data.publicUrl??'';}
function requestKey(){const bytes=new Uint8Array(16);window.crypto.getRandomValues(bytes);return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');}

export default function FixedBid({compact=false}:{compact?:boolean}){
 const [rows,setRows]=useState<Campaign[]>([]),[loading,setLoading]=useState(true),[loadingMore,setLoadingMore]=useState(false),[hasMore,setHasMore]=useState(false),[error,setError]=useState('');
 const [search,setSearch]=useState(''),[statusFilter,setStatusFilter]=useState<CampaignStatus>('all');
 const [message,setMessage]=useState(''),[joining,setJoining]=useState('');
 const displayRows=rows.length?rows:sampleFixedCampaigns;
 const showingSamples=rows.length===0;
 const mounted=useRef(true),requestId=useRef(0),requestInFlight=useRef(false),entryKeys=useRef(new Map<string,string>());
 async function load(reset=true,searchTerm=search,status=statusFilter){
  if(!reset&&(requestInFlight.current||loadingMore||!hasMore))return;
  if(!reset)requestInFlight.current=true;
  const request=++requestId.current;
  if(reset){requestInFlight.current=false;setLoading(true);setError('');setRows([]);setHasMore(false);}else{setLoadingMore(true);setError('');}
  try {
   if(!supabase){if(mounted.current&&request===requestId.current){setRows([]);setHasMore(false);setError('Supabase is not configured.');}return;}
   const offset=reset?0:rows.length;
   const {data,error}=await supabase.rpc('public_list_fixed_bid_campaigns_page',{p_search:searchTerm.trim()||null,p_status:status,p_limit:PAGE_SIZE,p_offset:offset});
   if(error)throw error;
   if(!mounted.current||request!==requestId.current)return;
   const batch=(data??[]) as unknown as Campaign[];
   let added=batch.length;
   setRows(current=>{if(reset)return batch;const known=new Set(current.map(row=>row.id));const fresh=batch.filter(row=>!known.has(row.id));added=fresh.length;return [...current,...fresh];});
   setHasMore(batch.length===PAGE_SIZE&&(reset||added>0));
  } catch {
   if(mounted.current&&request===requestId.current)setError(reset?'Fixed Bid campaigns could not be loaded. Please retry.':'More campaigns could not be loaded. Please retry.');
  } finally {
   if(!reset&&request===requestId.current)requestInFlight.current=false;
   if(mounted.current&&request===requestId.current){setLoading(false);setLoadingMore(false);}
  }
 }
 useEffect(()=>{mounted.current=true;const timer=window.setTimeout(()=>void load(true,search,statusFilter),search.trim()?250:0);return()=>{window.clearTimeout(timer);requestId.current+=1;};},[search,statusFilter]);
 useEffect(()=>()=>{mounted.current=false;requestId.current+=1;requestInFlight.current=false;},[]);
 async function joinCampaign(campaign:Campaign){
  if(!supabase||joining)return;
  setJoining(campaign.id);setMessage('');
  try{
   const {data:authData,error:authError}=await supabase.auth.getUser();
   if(authError)throw authError;
   if(!authData.user){setMessage('Please sign in from the website header before entering a campaign.');return;}
   let key=entryKeys.current.get(campaign.id);
   if(!key){key=requestKey();entryKeys.current.set(campaign.id,key);}
   const {data,error}=await supabase.rpc('member_join_fixed_bid_campaign',{p_campaign_id:campaign.id,p_idempotency_key:key});
   if(error){
    const raw=String(error.message||'');
    if(/insufficient/i.test(raw))throw new Error('Insufficient Funds – Please Add Funds');
    throw error;
   }
   entryKeys.current.delete(campaign.id);
   const result=(data??{}) as {entry_id?:string;entry_amount?:number;replayed?:boolean};
   setMessage(result.replayed?'Your previous entry request was already recorded. No second entry was created.':`Entry confirmed. Entry ID: ${result.entry_id||'recorded'} · Amount: ${money(Number(result.entry_amount??campaign.configuration?.entry_amount??0),'INR')}.`);
  }catch(e){setMessage(e instanceof Error?e.message:'Campaign entry could not be confirmed. Retry safely; the same request key will be reused.');}
  finally{setJoining('');}
 }
 return <section className={`fixedBidList${compact?" fixedBidCompact":""}`}>
  <div className="packageIntro"><span className="workspaceIcon"><Gavel/></span><div><h3>Fixed Bids</h3>{!compact&&<p>Review campaign rules, entry limits and schedules before participating. Entries are recorded by the secure server workflow.</p>}</div><button className="outline small" onClick={()=>void load(true)} disabled={loading||loadingMore}><RefreshCw size={14}/> Refresh</button></div>
  {message&&<div className="notice" role="status" aria-live="polite">{message}</div>}
  {!compact&&<div className="sponsorAdminForm" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:10,marginBottom:14}}><label>Search campaign title<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Enter campaign title"/></label><label>Campaign status<select value={statusFilter} onChange={e=>setStatusFilter(e.target.value as CampaignStatus)}><option value="all">All statuses</option><option value="scheduled">Scheduled</option><option value="live">Live</option><option value="ended">Ended</option></select></label></div>}
  {loading?<p className="packageState">Loading campaigns…</p>:
  <>{error&&<div className="notice" role="status">{error} <button className="outline small" onClick={()=>void load(true)}>Retry</button></div>}{showingSamples&&<div className="memberModuleHint">SAMPLE PREVIEW · Example cards only. Published campaigns automatically replace these samples.</div>}
  {!compact&&<><div className="memberModuleHint">{showingSamples?'3 sample campaigns shown':rows.length+' matching campaigns loaded'+(hasMore?' · more results are available':'')}</div><button className="outline small" type="button" onClick={()=>{setSearch('');setStatusFilter('all');}}>Clear filters</button></>}
  <div className="fixedBidGrid">{displayRows.map(r=>{const config=r.configuration??{};const canJoin=!showingSamples&&r.status==='live'&&Number(config.entry_amount)>0&&Boolean(config.starts_at)&&Boolean(config.ends_at);return <article className={showingSamples?"fixedBidCard samplePreviewCard":"fixedBidCard"} key={r.id}>
   <div className="fixedBidVisual">{productImageUrl(r.product?.image_path)?<img src={productImageUrl(r.product?.image_path)} alt={r.product?.name||'Campaign product'} loading="lazy"/>:<Package size={34}/>}<span>{r.product?.category??'FIXED BID'}</span></div>
   <div className="fixedBidBody"><span className="status">{showingSamples?'SAMPLE PREVIEW':r.status.toUpperCase()}</span><h3>{r.title}</h3>{r.product?.name&&<b>{r.product.name}</b>}<p>{r.description||r.product?.description||'Campaign details will be published by the administrator.'}</p>
    {Number(config.entry_amount)>0&&<p><b>Entry amount:</b> {money(Number(config.entry_amount),'INR')}</p>}
    {Number(config.winner_payment_amount)>0&&<p><b>Winner payment:</b> {money(Number(config.winner_payment_amount),'INR')}</p>}
    {config.max_entries_per_member&&<small>Entries per member: {config.max_entries_per_member}</small>}{config.max_entries_total&&<small>Campaign entry limit: {config.max_entries_total}</small>}{typeof config.refund_non_winners==='boolean'&&<small>Non-winner entry refunds: {config.refund_non_winners?'Included after winner settlement':'Not included'}</small>}
    {config.winner_count&&<small>Winner count: {config.winner_count}</small>}
    {config.starts_at&&<small>Starts: {new Date(config.starts_at).toLocaleString('en-IN')}</small>}
    {config.ends_at&&<small>Closes: {new Date(config.ends_at).toLocaleString('en-IN')}</small>}
    <small>Published {new Date(r.created_at).toLocaleDateString('en-IN')}</small>
    {canJoin?<button className="primary small" type="button" disabled={joining!==''} onClick={()=>void joinCampaign(r)}>{joining===r.id?'Submitting entry…':'Enter Fixed Bid Campaign'}</button>:r.status==='live'?<small className="protected">Entry rules are incomplete. Contact the administrator.</small>:null}
   </div></article>;})}</div>
  {error&&<div className="notice">{error}</div>}
  {hasMore&&<div className="marketPagination"><button className="outline darkOutline" disabled={loadingMore} onClick={()=>void load(false)}>{loadingMore?'Loading…':'Load more campaigns'}</button><span>{rows.length} campaigns loaded</span></div>}</>}
  {!compact&&<p className="memberModuleHint"><ShieldCheck size={14}/> Each entry uses a unique retry key and is processed with server-side limits and wallet-ledger checks.</p>}
 </section>;
}

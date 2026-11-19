import {useEffect,useState} from 'react';
import {Network,RefreshCw,Users} from 'lucide-react';
import {supabase} from '../lib/supabase';

type PlacementMember={member_code:string;id_type:'main'|'duplicate';main_member_code:string;display_name:string;status:string;depth:number;placement_position:string|null;created_at:string};
type PlacementResult={root_member_code:string;tree:PlacementMember[]};

export default function PlacementTree(){
 const [data,setData]=useState<PlacementResult|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [refresh,setRefresh]=useState(0);
 useEffect(()=>{
  let active=true;
  async function load(){
   setLoading(true);setError('');
   try{
    if(!supabase)throw new Error('Database connection is unavailable. Configure the intended Preview or Test environment.');
    const {data,error:loadError}=await supabase.rpc('get_my_placement_tree');
    if(!active)return;
    if(loadError)throw loadError;
    setData(data as PlacementResult);
   }catch(e){if(active)setError(e instanceof Error?e.message:'Placement tree could not be loaded. Please retry.');}
   finally{if(active)setLoading(false);}
  }
  void load();
  return()=>{active=false};
 },[refresh]);
 return <section className="referralWorkspace">
  <div className="packageIntro"><span className="workspaceIcon"><Network/></span><div><h3>My Placement Tree</h3><p>Placement positions are shown separately from Sponsor Referral genealogy.</p></div><button className="outline small" onClick={()=>setRefresh(v=>v+1)}><RefreshCw size={14}/> Refresh</button></div>
  {loading?<p className="packageState">Loading placement tree…</p>:error?<div className="notice" role="alert">{error} <button className="outline small" type="button" onClick={()=>setRefresh(v=>v+1)}>Retry</button></div>:data&&<>
   <div className="genealogyHead"><div><h4>Placement Network</h4><p>Main ID: {data.root_member_code}</p></div><span>{data.tree.length} positions</span></div>
   {data.tree.length===0?<div className="empty">No placement positions are recorded yet.</div>:<div className="genealogyList">{data.tree.map(m=><article className="genealogyMember" key={m.member_code} style={{'--tree-depth':Math.min(m.depth,8)} as React.CSSProperties}><span className="genealogyLine"/><div className="genealogyAvatar"><Users size={16}/></div><div className="genealogyInfo"><b>{m.display_name}</b><small>{m.member_code} · {m.id_type==='duplicate'?'Duplicate ID':'Main ID'} · Joined {new Date(m.created_at).toLocaleDateString('en-IN')}</small>{m.id_type==='duplicate'&&<small>Owned by Main ID: {m.main_member_code}</small>}<small>Position: {m.placement_position||'Not assigned'}</small></div><span className="genealogyLevel">{m.depth===0?'Root':'Level '+m.depth}</span><span className={m.status==='active'?'memberActive':'memberStatus'}>{m.status}</span></article>)}</div>}
   <p className="genealogyNote">The tree starts from your Main ID and includes both Main IDs and Duplicate IDs in their actual placement positions.</p>
  </>}
 </section>;
}

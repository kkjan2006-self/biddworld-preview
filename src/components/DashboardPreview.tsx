import {useState} from 'react';
import {ShieldCheck,Users,Wallet,Gavel,Gift,PackageCheck,TrendingUp,Clock3,IdCard,ArrowDownToLine,ArrowUpRight,Activity} from 'lucide-react';
import {money} from '../lib/format';

type Mode='member'|'admin';
const activity=[
 {label:'Package activation submitted',detail:'Starter Plus · Payment review pending',amount:'₹1,499',status:'Pending'},
 {label:'Referral commission',detail:'Level 1 · Main ID credited',amount:'+₹150',status:'Credited'},
 {label:'Auction bid',detail:'Wireless Headphones · Sample only',amount:'₹50',status:'Preview'}
];
export default function DashboardPreview(){
 const [mode,setMode]=useState<Mode>('member');
 return <section className="dashboardPreview">
  <div className="previewBanner"><ShieldCheck/><div><b>Interactive dashboard preview</b><span>Sample information only — no real accounts, money, bids or approvals are involved.</span></div></div>
  <div className="previewSwitch"><button className={mode==='member'?'selected':''} onClick={()=>setMode('member')}>User Dashboard</button><button className={mode==='admin'?'selected':''} onClick={()=>setMode('admin')}>Admin Dashboard</button></div>
  {mode==='member'?<div className="previewPanel">
   <div className="previewWelcome"><div><small>MEMBER PORTAL · SAMPLE ACCOUNT</small><h3>Welcome back, Demo Member</h3><p>Main ID: BW-M-10001 · Status: Active (sample)</p></div><span className="previewAvatar"><Users/></span></div>
   <div className="previewMetricGrid"><article><Wallet/><small>Bid Wallet</small><b>{money(2500)}</b><span>Non-withdrawable · Bidding only</span></article><article><TrendingUp/><small>Main Wallet</small><b>{money(875)}</b><span>Referral income (sample)</span></article><article><Users/><small>Direct referrals</small><b>12</b><span>Sample members</span></article><article><Gift/><small>Active packages</small><b>2</b><span>Separate activations</span></article></div>
   <div className="previewColumns"><article className="previewCard"><h4><IdCard/> Member IDs</h4><div className="previewLine"><span>Main Member ID</span><b>BW-M-10001</b></div><div className="previewLine"><span>Duplicate IDs</span><b>BW-D-10002</b></div><div className="previewLine"><span>Account status</span><b className="sampleGreen">Active</b></div></article><article className="previewCard"><h4><Activity/> Recent activity</h4>{activity.map(x=><div className="previewActivity" key={x.label}><div><b>{x.label}</b><small>{x.detail}</small></div><div><strong>{x.amount}</strong><small>{x.status}</small></div></div>)}</article></div>
   <div className="previewColumns"><article className="previewCard"><h4><Gavel/> Auction workspace</h4><div className="previewLine"><span>Live auctions</span><b>8</b></div><div className="previewLine"><span>My active bids</span><b>3</b></div><div className="previewLine"><span>Winning payments due</span><b>1</b></div><p className="previewFootnote">Sample figures only. Live bidding remains disabled.</p></article><article className="previewCard"><h4><ArrowDownToLine/> Withdrawals</h4><div className="previewLine"><span>Available Main Wallet</span><b>{money(875)}</b></div><div className="previewLine"><span>Pending request</span><b>{money(300)}</b></div><div className="previewLine"><span>Withdrawal status</span><b>Admin review</b></div><p className="previewFootnote">Withdrawal rules and approval workflows are not yet enabled.</p></article></div>
  </div>:<div className="previewPanel">
   <div className="previewWelcome"><div><small>CONTROL CENTER · SAMPLE ACCOUNT</small><h3>Administrator Dashboard</h3><p>System overview and operational queues · Demo data</p></div><span className="previewAvatar"><ShieldCheck/></span></div>
   <div className="previewMetricGrid"><article><Users/><small>Total members</small><b>1,248</b><span>Sample registered accounts</span></article><article><PackageCheck/><small>Pending activations</small><b>18</b><span>Awaiting payment verification</span></article><article><Wallet/><small>Withdrawal requests</small><b>7</b><span>Awaiting review</span></article><article><Gavel/><small>Live auctions</small><b>6</b><span>Sample active listings</span></article></div>
   <div className="previewColumns"><article className="previewCard"><h4><Activity/> Operations overview</h4><div className="previewLine"><span>Fixed Bid campaigns</span><b>4</b></div><div className="previewLine"><span>Package catalogue</span><b>5</b></div><div className="previewLine"><span>Open support cases</span><b>9</b></div><div className="previewLine"><span>Delivery tracking</span><b>13</b></div></article><article className="previewCard"><h4><Clock3/> Admin review queue</h4>{[['Package payment references','18 pending'],['Withdrawal approvals','7 pending'],['Winning item payments','3 pending'],['Delivery exceptions','2 flagged']].map(([a,b])=><div className="previewActivity" key={a}><b>{a}</b><strong>{b}</strong></div>)}</article></div>
   <div className="previewCard previewPermissions"><h4><ShieldCheck/> Admin controls planned</h4><div className="previewTagList">{['Member management','Package & activation settings','Referral plan configuration','Auction management','Wallet & withdrawals','Fixed Bid campaigns','Winning payments & delivery','Reports & exports','App settings','Audit logs & role permissions'].map(x=><span key={x}>{x}</span>)}</div><p className="previewFootnote">This is a layout preview, not a functioning admin console. All real administrative writes require secure server-side authorization and audit logging.</p></div>
  </div>}
 </section>;
}

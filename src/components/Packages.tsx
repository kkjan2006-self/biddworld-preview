import { useEffect, useRef, useState } from 'react';
import { Gift, RefreshCw, ShieldCheck } from 'lucide-react';
import { configured, supabase } from '../lib/supabase';
import { money } from '../lib/format';

type PackageItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  bid_wallet_credit: number;
};

export default function Packages() {
  const [items, setItems] = useState<PackageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activationEnabled,setActivationEnabled]=useState(false);
  const [error, setError] = useState('');
  const [selectedPackage,setSelectedPackage]=useState('');
  const [paymentReference,setPaymentReference]=useState('');
  const [receiptFile,setReceiptFile]=useState<File|null>(null);
  const [activationBusy,setActivationBusy]=useState(false);
  const [activationMessage,setActivationMessage]=useState('');
  const mountedRef = useRef(false);
  const requestIdRef = useRef(0);

  async function load() {
    const requestId = ++requestIdRef.current;
    const isCurrent = () => mountedRef.current && requestIdRef.current === requestId;
    setLoading(true);
    setError('');
    if (!supabase) {
      if (isCurrent()) {
        setItems([]);
        setLoading(false);
      }
      return;
    }
    try {
      const { data, error: queryError } = await supabase.rpc('public_list_active_packages_page',{p_limit:100,p_offset:0});
      if (!isCurrent()) return;
      if (queryError) {
        setItems([]);
        setError('Packages could not be loaded. Please try again later.');
      } else setItems((data ?? []) as PackageItem[]);
      const {data:sessionData}=await supabase.auth.getSession();
      if(!isCurrent())return;
      if(!sessionData.session){setActivationEnabled(false);return;}
      const{data:activationSetting,error:activationSettingError}=await supabase.from('app_settings').select('setting_value').eq('setting_key','package_activations_enabled').maybeSingle();
      if(!isCurrent())return;
      setActivationEnabled(!activationSettingError&&activationSetting?.setting_value===true);
      if(activationSettingError)setError('Package activation availability could not be verified. Activation requests remain unavailable.');
    } catch {
      if (!isCurrent()) return;
      setItems([]);
      setError('A network error prevented packages from loading. Please retry.');
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }

  async function submitActivation(){
    if(!supabase||activationBusy)return;
    const reference=paymentReference.trim();
    if(!selectedPackage){setActivationMessage('Select a package.');return;}
    if(reference.length<6||reference.length>80||!/^[A-Za-z0-9./_-]+$/.test(reference)){setActivationMessage('Enter a valid payment reference (6 to 80 letters or numbers).');return;}
    if(receiptFile&&(!['image/jpeg','image/png','application/pdf'].includes(receiptFile.type)||receiptFile.size>5*1024*1024)){setActivationMessage('Receipt must be JPG, PNG or PDF and no larger than 5 MB.');return;}
    setActivationBusy(true);setActivationMessage('');
    let uploadedReceiptPath:string|null=null;
    let activationSubmitted=false;
    let activationRpcRejected=false;
    try{
      const{data:authData,error:authError}=await supabase.auth.getUser();
      if(authError)throw authError;
      if(!authData.user){setActivationMessage('Please sign in before submitting a package activation request.');return;}
      let receiptPath:string|null=null;
      if(receiptFile){
        const safeName=receiptFile.name.toLowerCase().replace(/[^a-z0-9._-]+/g,'-').slice(-90)||'payment-receipt';
        const bytes=new Uint8Array(16);window.crypto.getRandomValues(bytes);const fileId=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');receiptPath=authData.user.id+'/'+fileId+'-'+safeName;
        const{error:uploadError}=await supabase.storage.from('package-receipts').upload(receiptPath,receiptFile,{contentType:receiptFile.type,upsert:false});
        if(uploadError)throw uploadError;
        uploadedReceiptPath=receiptPath;
      }
      const{error}=await supabase.rpc('submit_package_activation_with_receipt',{p_package_id:selectedPackage,p_payment_reference:reference,p_receipt_path:receiptPath});
      if(error){activationRpcRejected=typeof (error as {code?:unknown}).code==='string';throw error;}
      activationSubmitted=true;
      setActivationMessage('Package activation request submitted for Admin verification.');
      setPaymentReference('');setReceiptFile(null);setSelectedPackage('');
    }catch(e){
      const message=e instanceof Error?e.message:'Package activation request could not be completed. Check your connection and retry.';
      if(uploadedReceiptPath&&!activationSubmitted&&activationRpcRejected){
        try{
          const{error:cleanupError}=await supabase.storage.from('package-receipts').remove([uploadedReceiptPath]);
          setActivationMessage(cleanupError?message+' The uploaded receipt could not be removed automatically; please contact support.':message);
        }catch{setActivationMessage(message+' The uploaded receipt could not be removed automatically; please contact support.');}
      }else setActivationMessage(message);
    }
    finally{setActivationBusy(false);}
  }

  useEffect(() => {
    mountedRef.current = true;
    void load();
    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
    };
  }, []);

  return <section className="packageWorkspace">
    <div className="packageIntro"><span className="workspaceIcon"><Gift /></span>
      <div><h3>Membership packages</h3><p>Free member registration is available. Paid package activation is not currently open.</p></div>
    </div>
    {!configured && <div className="notice"><b>Database not connected:</b> Configure the intended Preview or separate Test environment to view package information. Do not connect Production for testing.</div>}
    {!activationEnabled && <div className="notice" role="status"><ShieldCheck size={16}/> <b>Package activation is temporarily locked.</b> Payment references, activation requests and wallet credits are unavailable while this feature remains disabled.</div>}
    {activationEnabled&&<section className="packageActivationForm"><h3>Request Package Activation</h3><p>Select a package, scan the KRFSI UPI QR, pay the displayed package amount, then submit your UTR and payment receipt.</p><div className="walletFundingQr"><img src="/payment/biddworld-main-wallet-qr.svg" alt="KRFSI UPI payment QR code"/><b>Payee: KRFSI</b><span>UPI ID: krindia@bpunity</span><small>Scan with any UPI app. Enter the selected package amount before paying.</small></div><label>Package<select value={selectedPackage} onChange={e=>setSelectedPackage(e.target.value)}><option value="">Select package</option>{items.map(item=><option key={item.id} value={item.id}>{item.name} · {money(Number(item.price),item.currency||'INR')}</option>)}</select></label><label>Payment Reference / UTR<input value={paymentReference} onChange={e=>setPaymentReference(e.target.value)} maxLength={80} placeholder="Enter payment reference"/></label><label>Payment Screenshot / Receipt (JPG, PNG or PDF · max 5 MB)<input type="file" accept="image/jpeg,image/png,application/pdf" onChange={e=>setReceiptFile(e.target.files?.[0]??null)}/></label><button type="button" className="primary" disabled={activationBusy||!selectedPackage} onClick={()=>void submitActivation()}>{activationBusy?'Submitting…':'Submit Activation Request'}</button>{activationMessage&&<div className="notice" role="status">{activationMessage}</div>}</section>}
    {loading ? <p className="packageState">Loading package information…</p> : error ? <div className="notice">{error} <button className="outline small" onClick={() => void load()}><RefreshCw size={14}/> Retry</button></div> :
      items.length === 0 ? <div className="empty packageEmpty">No packages are currently published. Free registration remains available.</div> :
      <div className="packageGrid">{items.map(item => <article className="packageCard" key={item.id}>
        <div className="category">BIDDWORLD MEMBERSHIP</div><h4>{item.name}</h4>
        <strong className="packagePrice">{money(Number(item.price), item.currency || 'INR')}</strong>
        <p>{item.description || 'Package benefits will be published after the owner-approved rules are finalized.'}</p>
        <div className="packageCredit"><span>Proposed Bid Wallet credit (not issued)</span><b>{money(Number(item.bid_wallet_credit), item.currency || 'INR')}</b></div>
        <div className="notice">View-only information. Package payments and activation are currently unavailable.</div>
      </article>)}</div>}
  </section>;
}

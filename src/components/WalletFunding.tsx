import {useEffect,useRef,useState} from 'react';
import type {FormEvent} from 'react';
import {QrCode,Upload,RefreshCw,Clock3} from 'lucide-react';
import {supabase} from '../lib/supabase';
import {money} from '../lib/format';
type RequestRow={id:string;amount:number;currency:string;payment_reference:string;status:string;review_note:string|null;created_at:string;reviewed_at:string|null};
export default function WalletFunding(){
 const [open,setOpen]=useState(false),[amount,setAmount]=useState(''),[utr,setUtr]=useState(''),[receipt,setReceipt]=useState<File|null>(null);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[rows,setRows]=useState<RequestRow[]>([]),[historyLoading,setHistoryLoading]=useState(true),[historyError,setHistoryError]=useState(''),[userId,setUserId]=useState<string|null>(null);
 const inFlight=useRef(false),historyRequest=useRef(0);
 useEffect(()=>{if(!supabase){setUserId(null);setHistoryLoading(false);return;}let active=true,authEventObserved=false;const{data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{authEventObserved=true;if(active)setUserId(session?.user?.id??null);});void supabase.auth.getUser().then(({data,error})=>{if(!active||authEventObserved)return;if(error)throw error;setUserId(data.user?.id??null);}).catch(()=>{if(active&&!authEventObserved){setUserId(null);setHistoryError('Your sign-in session could not be verified. Please sign in again.');setHistoryLoading(false);}});return()=>{active=false;subscription.unsubscribe();historyRequest.current++;};},[]);
 async function load(){const seq=++historyRequest.current;if(!supabase||!userId){setRows([]);setHistoryLoading(false);return;}setHistoryLoading(true);setHistoryError('');try{const{data,error}=await supabase.rpc('member_list_my_wallet_fund_requests');if(error)throw error;if(seq===historyRequest.current)setRows((data??[]) as RequestRow[]);}catch(e){if(seq===historyRequest.current)setHistoryError(e instanceof Error?e.message:'Add Money requests could not be loaded. Please retry.');}finally{if(seq===historyRequest.current)setHistoryLoading(false);}}
 useEffect(()=>{setRows([]);setHistoryError('');setHistoryLoading(Boolean(userId));void load();return()=>{historyRequest.current++;};},[userId]);
 async function submit(e:FormEvent){
  e.preventDefault();if(!supabase||busy||inFlight.current)return;
  const value=Number(amount),reference=utr.trim();
  if(!Number.isFinite(value)||value<=0||value>10000000||!/^\d+(?:\.\d{1,2})?$/.test(amount.trim())){setMessage('Enter a valid amount with up to two decimal places.');return;}
  if(!/^[A-Za-z0-9./_-]{6,80}$/.test(reference)){setMessage('Enter a valid UTR / payment reference (6–80 characters).');return;}
  if(!receipt){setMessage('Upload your payment screenshot or receipt.');return;}
  if(!['image/jpeg','image/png','application/pdf'].includes(receipt.type)||receipt.size>5*1024*1024){setMessage('Choose a JPG, PNG or PDF file up to 5 MB.');return;}
  inFlight.current=true;setBusy(true);setMessage('');let uploadedReceiptPath:string|null=null;let rpcAttempted=false;let rpcDefinitelyRejected=false;
  try{
   const{data:{user},error:userError}=await supabase.auth.getUser();if(userError||!user)throw new Error('Please sign in again.');
   const safe=receipt.name.toLowerCase().replace(/[^a-z0-9._-]+/g,'-').slice(-80)||'receipt';
   const path=user.id+'/wallet-funding/'+crypto.randomUUID()+'-'+safe;
   const{error:uploadError}=await supabase.storage.from('wallet-funding-receipts').upload(path,receipt,{contentType:receipt.type,upsert:false});
   if(uploadError)throw uploadError;uploadedReceiptPath=path;
   rpcAttempted=true;const{error}=await supabase.rpc('member_submit_wallet_fund_request',{p_amount:value,p_payment_reference:reference,p_receipt_path:path});
   if(error){rpcDefinitelyRejected=typeof (error as {code?:unknown}).code==='string';throw error;}
   setAmount('');setUtr('');setReceipt(null);
   const input=document.getElementById('wallet-funding-receipt') as HTMLInputElement|null;if(input)input.value='';
   setMessage('Request submitted. Your Main Wallet will be credited after Admin verifies the payment.');
   await load();
  }catch(err){const message=err instanceof Error?err.message:'Your request could not be submitted. Please retry.';if(uploadedReceiptPath&&rpcAttempted&&rpcDefinitelyRejected){try{const{error:cleanupError}=await supabase.storage.from('wallet-funding-receipts').remove([uploadedReceiptPath]);setMessage(cleanupError?message+' The uploaded receipt could not be removed automatically; please contact support.':message)}catch{setMessage(message+' The uploaded receipt could not be removed automatically; please contact support.')}}else setMessage(message);}
  finally{inFlight.current=false;setBusy(false);}
 }
 return <section className="walletFunding">
  <button type="button" className="primary" onClick={()=>setOpen(v=>!v)}><QrCode size={17}/> {open?'Close Add Money':'Add Money'}</button>
  {open&&<div className="walletFundingPanel">
   <h5>Add Money to Main Wallet</h5><p>Scan this QR code with any UPI app, make your payment, then enter the UTR number and upload the payment receipt.</p>
   <div className="walletFundingQr"><img src="/payment/biddworld-main-wallet-qr.svg" alt="KRFSI UPI payment QR code"/><b>KRFSI</b><span>UPI ID: krindia@bpunity</span><small>Scan to pay with any UPI app</small></div>
   <form onSubmit={submit} className="memberWithdrawalForm">
    <label>Amount (INR)<input type="number" min="1" max="10000000" step="0.01" required value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Enter amount"/></label>
    <label>UTR / Payment Reference<input required minLength={6} maxLength={80} value={utr} onChange={e=>setUtr(e.target.value)} placeholder="Enter UTR number"/></label>
    <label>Payment Screenshot / Receipt (JPG, PNG or PDF · Max 5 MB)<input id="wallet-funding-receipt" type="file" accept="image/jpeg,image/png,application/pdf" onChange={e=>setReceipt(e.target.files?.[0]??null)}/></label>
    <button type="submit" className="primary" disabled={busy}>{busy?'Submitting…':'Submit Payment for Review'}</button>
    {message&&<small role="status">{message}</small>}
   </form>
  </div>}
  <div className="walletFundingHistory"><h5><Clock3 size={16}/> Add Money Requests</h5>{historyLoading?<small>Loading Add Money requests…</small>:historyError?<small role="alert">{historyError}</small>:rows.length?rows.map(row=><article key={row.id}><div><b>{money(Number(row.amount),row.currency||'INR')}</b><small>UTR: {row.payment_reference} · {new Date(row.created_at).toLocaleString('en-IN')}</small>{row.review_note&&<small>Admin note: {row.review_note}</small>}</div><strong className={row.status==='approved'?'memberActive':row.status==='rejected'?'memberStatus':''}>{row.status.toUpperCase()}</strong></article>):<small>No Add Money requests yet.</small>}<button type="button" className="outline small" onClick={()=>void load()}><RefreshCw size={14}/> Refresh requests</button></div>
 </section>;
}
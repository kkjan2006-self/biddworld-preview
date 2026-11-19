export type DuplicateIdCreationResult={id:string;member_code:string;main_member_code:string;under_member_code:string;status:'pending'};

export function parseDuplicateIdCreationResult(value:unknown):DuplicateIdCreationResult{
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Duplicate ID creation returned an unexpected database response. No success was reported. Refresh the directory and verify the record before retrying.');
 const row=value as Record<string,unknown>;
 const fields=['id','member_code','main_member_code','under_member_code'];
 if(fields.some(field=>typeof row[field]!=='string'||!(row[field] as string).trim())||row.status!=='pending'){
  throw new Error('Duplicate ID creation response is incomplete or uses an unsupported RPC contract. Refresh the directory and verify the record before retrying.');
 }
 return {id:row.id as string,member_code:row.member_code as string,main_member_code:row.main_member_code as string,under_member_code:row.under_member_code as string,status:'pending'};
}

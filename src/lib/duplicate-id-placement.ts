export type PlacementCandidate={member_code:string;status:string};

export function normalizeMemberCode(value:string):string{
 return value.trim().toUpperCase();
}

export function getEligibleUnderIds<T extends PlacementCandidate>(ids:T[],mainMemberCode:string):T[]{
 const mainCode=normalizeMemberCode(mainMemberCode);
 return ids.filter(row=>row.status==='active'&&normalizeMemberCode(row.member_code)!==mainCode);
}

export function validateDistinctDuplicatePlacement(mainMemberCode:string,underMemberCode:string):void{
 const mainCode=normalizeMemberCode(mainMemberCode),underCode=normalizeMemberCode(underMemberCode);
 if(!mainCode)throw new Error('Enter an active Main ID.');
 if(!underCode)throw new Error('Select an active Under / Placement ID.');
 if(mainCode===underCode)throw new Error('The Under / Placement ID must be different from the owner Main ID.');
}

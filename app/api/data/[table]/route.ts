import { NextResponse } from 'next/server';
import { db, requireUser, requireAdmin } from '@/lib/firebaseAdmin';

const allowed = new Set(['gos','productos','seguimiento_claims','perfiles_joiners','integrantes_fotos','tienda_productos','pedidos','solicitudes_envio','wishlist_joiners']);
const publicRead = new Set(['gos','productos','tienda_productos','integrantes_fotos']);
const adminEmail = 'liahwang1852@gmail.com';
export const revalidate = 20;
const docId = (table:string,row:any) => { if(row.id!==undefined&&row.id!==null)return String(row.id); if(table==='perfiles_joiners')return encodeURIComponent(String(row.user_email||'')); if(table==='seguimiento_claims')return `${row.claim_key||'claim'}-${Buffer.from(String(row.user_email||'unknown')).toString('base64url')}`; if(table==='wishlist_joiners')return `${row.user_email||'user'}-${row.producto_id||'item'}`; return `${Date.now()}-${Math.random().toString(36).slice(2)}`; };
async function access(request:Request, table:string, write:boolean) {
  if (!allowed.has(table)) throw new Error('TABLE_NOT_ALLOWED');
  const token = request.headers.get('authorization');
  if (!write && publicRead.has(table) && (table !== 'productos' || !token)) return { email:null, admin:false };
  const user = await requireUser(request); const email=(user.email||'').toLowerCase();
  const admin=email===adminEmail;
  if (write && !admin && !['perfiles_joiners','wishlist_joiners','solicitudes_envio','pedidos'].includes(table)) throw new Error('FORBIDDEN');
  if (!write && !admin && !publicRead.has(table) && !['perfiles_joiners','seguimiento_claims','pedidos','solicitudes_envio','wishlist_joiners'].includes(table)) throw new Error('FORBIDDEN');
  return {email,admin};
}
export async function GET(request:Request,{params}:{params:{table:string}}) {
 try { const table=params.table; const {email,admin}=await access(request,table,false); const url=new URL(request.url); const filters=JSON.parse(url.searchParams.get('filters')||'[]') as Array<[string,any,string?]>; let query:any=db.collection(table); if(!admin && email && !publicRead.has(table)) query=query.where('user_email','==',email); for(const [field,value,op] of filters) query=query.where(field,op==='in'?'in':'==',value); const snap=await query.get(); let rows=snap.docs.map((d:any)=>({id:Number.isNaN(Number(d.id))?d.id:Number(d.id),...d.data()}));
  if(table==='productos'){const gs=await db.collection('gos').get();const map=new Map(gs.docs.map(d=>[Number(d.id),{id:Number(d.id),...d.data()}]));rows=rows.map(r=>{const raw=r.claims_integrantes&&typeof r.claims_integrantes==='object'?r.claims_integrantes:{};const claims=admin?raw:Object.fromEntries(Object.entries(raw).map(([slot,users]:[string,any])=>[slot,Object.fromEntries(Object.values(users||{}).map((qty:any,index:number)=>[`joiner_${index+1}`,qty]))]));return {...r,claims_integrantes:claims,gos:map.get(Number(r.go_id))||null};});}
  
  const ord=url.searchParams.get('order'); if(ord){const [k,asc]=JSON.parse(ord); rows.sort((a,b)=>(a[k]>b[k]?1:a[k]<b[k]?-1:0)*(asc?1:-1));}
  return NextResponse.json({data:rows},{headers:{'Cache-Control':publicRead.has(table)?'public, s-maxage=20, stale-while-revalidate=60':'private, no-store'}});
 } catch(e:any){const m=e.message||'ERROR'; return NextResponse.json({error:m},{status:m==='UNAUTHORIZED'?401:m==='FORBIDDEN'?403:400});}
}
export async function POST(request:Request,{params}:{params:{table:string}}){return mutate(request,params.table,'POST');}
export async function PATCH(request:Request,{params}:{params:{table:string}}){return mutate(request,params.table,'PATCH');}
export async function DELETE(request:Request,{params}:{params:{table:string}}){return mutate(request,params.table,'DELETE');}
async function mutate(request:Request,table:string,method:string){
 try{const {email,admin}=await access(request,table,true);const body=await request.json();const filters=body.filters||[];const records=body.records||[];
 if(!admin && table==='pedidos' && !(method==='PATCH' && Object.keys(body.values||{}).length===1 && body.values?.estado_envio==='Envío solicitado')) return NextResponse.json({error:'FORBIDDEN'},{status:403});
 if(!admin && table==='solicitudes_envio' && method!=='POST') return NextResponse.json({error:'FORBIDDEN'},{status:403});
 if(!admin && table==='wishlist_joiners' && method!=='POST') return NextResponse.json({error:'FORBIDDEN'},{status:403});
 if(method==='POST'){if(!Array.isArray(records)||records.length>100)return NextResponse.json({error:'Invalid records'},{status:400});const batch=db.batch();for(const [index,row] of records.entries()){if(!admin && (['perfiles_joiners','wishlist_joiners','solicitudes_envio'].includes(table)) && (!row.user_email || String(row.user_email).toLowerCase()!==email))return NextResponse.json({error:'FORBIDDEN'},{status:403});if(row.id===undefined && !['perfiles_joiners','seguimiento_claims'].includes(table))row.id=Date.now()+index;const ref=db.collection(table).doc(docId(table,row));batch.set(ref,row,{merge:body.action==='upsert'});}await batch.commit();return NextResponse.json({data:records});}
 let snap=await db.collection(table).get();let docs=snap.docs.filter(d=>filters.every(([k,v,op]:[string,any,string?])=>op==='in'?Array.isArray(v)&&v.includes(d.get(k)):d.get(k)===v));if(!admin)docs=docs.filter(d=>String(d.get('user_email')||'').toLowerCase()===email);if(method==='PATCH'){const batch=db.batch();for(const d of docs)batch.set(d.ref,body.values||{},{merge:true});await batch.commit();return NextResponse.json({data:{count:docs.length}});}const batch=db.batch();for(const d of docs)batch.delete(d.ref);await batch.commit();return NextResponse.json({data:{count:docs.length}});
 }catch(e:any){const m=e.message||'ERROR';return NextResponse.json({error:m},{status:m==='UNAUTHORIZED'?401:m==='FORBIDDEN'?403:400});}}

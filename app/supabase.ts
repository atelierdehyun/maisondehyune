'use client';
/** Compatibility layer: keeps the existing page query syntax while moving all data access to Firebase. */
import { firebaseAuth } from '@/lib/firebaseClient';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendEmailVerification } from 'firebase/auth';

type Row = Record<string, any>;
type Result = { data: any; error: { message: string } | null };
const publicTables = new Set(['gos','productos','tienda_productos','integrantes_fotos']);
const uploadedMedia = new Map<string,string>();
async function request(table: string, method: string, payload?: any, filters: Array<[string, any, string?]> = [], order?: [string, boolean], single = false): Promise<Result> {
  try {
    await firebaseAuth.authStateReady();
    const token = await firebaseAuth.currentUser?.getIdToken();
    const qs = method === 'GET' ? `?filters=${encodeURIComponent(JSON.stringify(filters))}${order ? `&order=${encodeURIComponent(JSON.stringify(order))}` : ''}` : '';
    const response = await fetch(`/api/data/${encodeURIComponent(table)}${qs}`, {
      method, headers: { 'Content-Type':'application/json', ...(token ? { Authorization:`Bearer ${token}` } : {}) },
      body: method === 'GET' ? undefined : JSON.stringify({ ...payload, filters, order, single }),
      ...(method === 'GET' ? {} : {})
    });
    const json = await response.json();
    if (!response.ok) return { data: null, error: { message: json.error || `HTTP ${response.status}` } };
    const data = json.data ?? null; return { data: single && Array.isArray(data) ? (data[0] ?? null) : data, error: null };
  } catch (e) { return { data: null, error: { message: e instanceof Error ? e.message : 'Network error' } }; }
}
class Query {
  private filters: Array<[string, any, string?]> = []; private ordering?: [string, boolean]; private mode = 'GET'; private payload: any; private one = false;
  constructor(private table: string) {}
  select(_fields = '*') { return this; }
  eq(field: string, value: any) { this.filters.push([field,value,'==']); return this; }
  in(field: string, values: any[]) { this.filters.push([field,values,'in']); return this; }
  order(field: string, options?: {ascending?:boolean}) { this.ordering = [field, options?.ascending !== false]; return this; }
  single() { this.one = true; return this; }
  maybeSingle() { this.one = true; return this; }
  insert(data: Row | Row[]) { this.mode='POST'; this.payload={ action:'insert', records:Array.isArray(data)?data:[data] }; return this; }
  upsert(data: Row | Row[], _options?: any) { this.mode='POST'; this.payload={ action:'upsert', records:Array.isArray(data)?data:[data] }; return this; }
  update(data: Row) { this.mode='PATCH'; this.payload={ action:'update', values:data }; return this; }
  delete() { this.mode='DELETE'; this.payload={ action:'delete' }; return this; }
  then(resolve: (v:Result)=>any, reject?: (e:any)=>any) { return request(this.table,this.mode,this.payload,this.filters,this.ordering,this.one).then(resolve,reject); }
}
const auth = {
  getSession: async () => { await firebaseAuth.authStateReady(); const u=firebaseAuth.currentUser; if(!u) return {data:{session:null},error:null}; return {data:{session:{access_token:await u.getIdToken(),user:{id:u.uid,email:u.email}}},error:null}; },
  getUser: async () => { await firebaseAuth.authStateReady(); return ({data:{user: firebaseAuth.currentUser ? {id:firebaseAuth.currentUser.uid,email:firebaseAuth.currentUser.email} : null},error:null}); },
  signUp: async ({email,password}:{email:string;password:string}) => { try { const credential=await createUserWithEmailAndPassword(firebaseAuth,email.trim().toLowerCase(),password); await sendEmailVerification(credential.user); return {data:{user:firebaseAuth.currentUser},error:null}; } catch(e:any) { return {data:null,error:{message:e.message}}; } },
  signInWithPassword: async ({email,password}:{email:string;password:string}) => { try { await signInWithEmailAndPassword(firebaseAuth,email.trim().toLowerCase(),password); return {data:{user:firebaseAuth.currentUser},error:null}; } catch(e:any) { return {data:null,error:{message:e.message}}; } },
  signOut: async () => { await signOut(firebaseAuth); return {error:null}; },
  onAuthStateChange: (cb:(event:string,session:any)=>void) => ({data:{subscription:onAuthStateChanged(firebaseAuth,u=>cb('SIGNED_IN',u?{user:{id:u.uid,email:u.email}}:null))}})
};
export const supabase: any = {
  auth,
  from: (table:string) => new Query(table),
  storage: { from: (bucket:string) => ({
    upload: async (path:string,file:File,_opts?:any) => { const token=await firebaseAuth.currentUser?.getIdToken(); const fd=new FormData(); fd.append('file',file); fd.append('folder',_opts?.folder || 'catalogo'); const res=await fetch('/api/media/upload',{method:'POST',headers:token?{Authorization:`Bearer ${token}`}:{},body:fd}); const j=await res.json(); if(res.ok) uploadedMedia.set(path,j.secure_url); return res.ok?{data:{path},error:null}:{data:null,error:{message:j.error||'Upload failed'}}; },
    getPublicUrl: (path:string) => ({data:{publicUrl:uploadedMedia.get(path)||path}})
  }) }
};

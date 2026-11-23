import { NextResponse } from 'next/server';
import { db, requireAdmin } from '@/lib/firebaseAdmin';
import gos from '@/migration-data/gos.json';
import productos from '@/migration-data/productos.json';
import seguimiento from '@/migration-data/seguimiento_claims.json';
import perfiles from '@/migration-data/perfiles_joiners.json';
import fotos from '@/migration-data/integrantes_fotos.json';
import tienda from '@/migration-data/tienda_productos.json';
import pedidos from '@/migration-data/pedidos.json';
import envios from '@/migration-data/solicitudes_envio.json';
import wishlist from '@/migration-data/wishlist_joiners.json';
const datasets:Record<string,any[]>={gos,productos,seguimiento_claims:seguimiento,perfiles_joiners:perfiles,integrantes_fotos:fotos,tienda_productos:tienda,pedidos,solicitudes_envio:envios,wishlist_joiners:wishlist};
function parseJson(value:any,fallback:any){if(typeof value!=='string')return value??fallback;try{return JSON.parse(value)}catch{return fallback}}
function number(value:any){if(value===''||value===null||value===undefined)return null;const n=Number(value);return Number.isFinite(n)?n:value}
function normalize(table:string,source:any){const row={...source};if(row.id!==undefined)row.id=number(row.id);const numeric:Record<string,string[]>={gos:['precio','claims_count','max_stock'],productos:['precio','go_id','cantidad_disponible'],seguimiento_claims:['monto_abonado'],tienda_productos:['precio','cantidad_disponible'],pedidos:['total_pagar','cantidad_disponible','monto_abonado'],solicitudes_envio:['costo_envio'],wishlist_joiners:['producto_id']};for(const field of numeric[table]||[])if(field in row)row[field]=number(row[field]);if(table==='productos'){row.stock_slots=parseJson(row.stock_slots,{});row.claims_integrantes=parseJson(row.claims_integrantes,{});}if(table==='tienda_productos'){row.fotos_extra=parseJson(row.fotos_extra,[]);row.variantes=parseJson(row.variantes,[]);row.visible=row.visible==='true'||row.visible===true;row.destacado=row.destacado==='true'||row.destacado===true;}return row;}
export async function POST(request:Request){try{await requireAdmin(request);const summary:Record<string,number>={};for(const [table,rows] of Object.entries(datasets)){let batch=db.batch(),count=0;for(const source of rows){const row=normalize(table,source);let id=String(row.id??'');if(table==='perfiles_joiners')id=encodeURIComponent(String(row.user_email||''));if(table==='seguimiento_claims')id=`${row.claim_key||'claim'}-${Buffer.from(String(row.user_email||'unknown')).toString('base64url')}`;if(!id)continue;batch.set(db.collection(table).doc(id),row,{merge:true});count++;if(count%400===0){await batch.commit();batch=db.batch();}}if(count%400)await batch.commit();summary[table]=count;}return NextResponse.json({ok:true,summary});}catch(e:any){const m=e.message||'ERROR';return NextResponse.json({error:m},{status:m==='UNAUTHORIZED'?401:403});}}

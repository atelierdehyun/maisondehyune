import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { db, requireUser } from '@/lib/firebaseAdmin';
type Item={productId:number;variantName?:string;quantity:number};
export async function POST(request:Request){
 try{
  const user=await requireUser(request);const email=(user.email||'').toLowerCase().trim();if(!email)return NextResponse.json({error:'Inicia sesión.'},{status:401});
  const body=await request.json();const items=body.items as Item[];if(!Array.isArray(items)||!items.length||items.length>30)return NextResponse.json({error:'Carrito inválido.'},{status:400});
  for(const item of items)if(!Number.isInteger(item.productId)||!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>30)throw new Error('CANTIDAD_INVALIDA');
  const byProduct=new Map<number,Item[]>();for(const item of items)byProduct.set(item.productId,[...(byProduct.get(item.productId)||[]),item]);
  let total=0;const summary:string[]=[];let firstImage:string|null=null;
  const refs=[...byProduct.keys()].map(id=>db.collection('tienda_productos').doc(String(id)));
  await db.runTransaction(async tx=>{const snaps=await tx.getAll(...refs);
   for(const snap of snaps){if(!snap.exists)throw new Error('PRODUCT_NOT_FOUND');const product=snap.data()||{};const productItems=byProduct.get(Number(snap.id))||[];const variants=Array.isArray(product.variantes)?structuredClone(product.variantes):[];
    if(variants.length){for(const item of productItems){const variant=variants.find((v:any)=>v.nombre===item.variantName);if(!variant||Number(variant.stock)<item.quantity)throw new Error('OUT_OF_STOCK');variant.stock=Number(variant.stock)-item.quantity;const price=Number(variant.precio);if(!Number.isFinite(price)||price<0)throw new Error('PRECIO_INVALIDO');total+=price*item.quantity;summary.push(`${item.quantity}x ${product.nombre_producto}${item.variantName?` [${item.variantName}]`:''}`);}}
    else{const quantity=productItems.reduce((n,item)=>n+item.quantity,0);const stock=Number(product.cantidad_disponible||0);if(stock<quantity)throw new Error('OUT_OF_STOCK');const price=Number(product.precio);if(!Number.isFinite(price)||price<0)throw new Error('PRECIO_INVALIDO');total+=price*quantity;summary.push(`${quantity}x ${product.nombre_producto}`);}
    const remaining=variants.length?variants.reduce((n:number,v:any)=>n+Number(v.stock||0),0):Number(product.cantidad_disponible||0)-productItems.reduce((n,item)=>n+item.quantity,0);
    tx.update(snap.ref,{...(variants.length?{variantes:variants}:{}),cantidad_disponible:remaining,estado_pago:remaining===0?'SOLD OUT':product.estado_pago});
    if(!firstImage&&product.imagen_producto)firstImage=String(product.imagen_producto);
   }
   const orderId=Date.now()*1000+Math.floor(Math.random()*1000);const orderRef=db.collection('pedidos').doc(String(orderId));tx.set(orderRef,{id:orderId,user_email:email,tipo_servicio:'SHOP',producto_nombre:summary.join(' + '),imagen_producto:firstImage,total_pagar:total,estado_pago:'Sin pagar',estado_confirmacion:'Pendiente',estado_envio:'En bodega',detalles:`Nombre: ${String(body.name||'')} | IG: ${String(body.instagram||'')} | En bodega`,created_at:FieldValue.serverTimestamp()});
  });
  return NextResponse.json({ok:true,total});
 }catch(e:any){const m=e.message||'ERROR';return NextResponse.json({error:m},{status:m==='UNAUTHORIZED'?401:m==='OUT_OF_STOCK'?409:400});}
}

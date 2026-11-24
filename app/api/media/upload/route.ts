import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { requireAdmin } from '@/lib/firebaseAdmin';
export const runtime='nodejs';
export async function POST(request:Request){
 try{
  await requireAdmin(request);
  const cloud=process.env.CLOUDINARY_CLOUD_NAME, key=process.env.CLOUDINARY_API_KEY, secret=process.env.CLOUDINARY_API_SECRET;
  if(!cloud||!key||!secret) return NextResponse.json({error:'Cloudinary no está configurado.'},{status:503});
  const form=await request.formData(); const file=form.get('file'); const requestedFolder=String(form.get('folder')||'catalogo');
  const allowedFolders=new Set(['catalogo','shop','gos','productos','integrantes']);
  if(!allowedFolders.has(requestedFolder)) return NextResponse.json({error:'Carpeta de destino no permitida.'},{status:400});
  const folder=requestedFolder;
  if(!(file instanceof File)) return NextResponse.json({error:'Archivo no válido.'},{status:400});
  if(file.size>10*1024*1024) return NextResponse.json({error:'La imagen supera 10 MB.'},{status:413});
  if(!file.type.startsWith('image/')) return NextResponse.json({error:'Solo se permiten archivos de imagen.'},{status:415});
  if(!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)) return NextResponse.json({error:'Formato no permitido. Usa JPG, PNG, WebP o GIF.'},{status:400});
  const timestamp=Math.floor(Date.now()/1000); const params=`folder=hyuneatelier/${folder}&timestamp=${timestamp}`;
  const signature=createHash('sha1').update(params+secret).digest('hex');
  const upload=new FormData(); upload.append('file',file); upload.append('api_key',key); upload.append('timestamp',String(timestamp)); upload.append('folder',`hyuneatelier/${folder}`); upload.append('signature',signature);
  const response=await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`,{method:'POST',body:upload}); const data=await response.json();
  if(!response.ok) return NextResponse.json({error:data.error?.message||'Cloudinary rechazó la imagen.'},{status:502});
  return NextResponse.json({secure_url:data.secure_url,public_id:data.public_id});
 }catch(e:any){const m=e.message||'ERROR';return NextResponse.json({error:m},{status:m==='UNAUTHORIZED'?401:403});}
}

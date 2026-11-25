import 'server-only';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

const privateKey = required('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n');

const app =
  getApps()[0] ??
  initializeApp({
    credential: cert({
      projectId: required('FIREBASE_PROJECT_ID'),
      clientEmail: required('FIREBASE_CLIENT_EMAIL'),
      privateKey,
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });

export const adminAuth = getAuth(app);
export const db = getFirestore(app);

export async function requireUser(request: Request) {
  const header = request.headers.get('authorization') || '';
  const match = header.match(/^Bearer (.+)$/i);

  if (!match) {
    throw new Error('UNAUTHORIZED');
  }

  return adminAuth.verifyIdToken(match[1]);
}

export async function requireAdmin(request: Request) {
  const user = await requireUser(request);
  const email = (user.email || '').trim().toLowerCase();

  if (email !== 'liahwang1852@gmail.com') {
    throw new Error('FORBIDDEN');
  }

  return user;
}

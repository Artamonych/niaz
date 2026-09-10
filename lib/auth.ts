import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { prisma } from './db';

const COOKIE = 'niaz_session';
const MAX_AGE = 60 * 60 * 8; // рабочая смена

export type Session = { userId: string; role: string; fio: string };

function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error('AUTH_SECRET не задан — вход в CRM работать не будет');
  return new TextEncoder().encode(value);
}

export const hashPassword = (plain: string) => bcrypt.hash(plain, 10);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

export async function createSession(session: Session) {
  const token = await new SignJWT(session)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: MAX_AGE,
    path: '/',
  });
}

export async function readSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as Session;
  } catch {
    return null; // просроченная или подделанная кука — просто не пускаем
  }
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

/** Пользователь для страниц CRM: свежая роль из базы, а не из куки. */
export async function currentUser() {
  const session = await readSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, fio: true, email: true, role: true, active: true },
  });

  return user?.active ? user : null;
}

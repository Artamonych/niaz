import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { leadSchema } from '@/lib/lead-schema';

/** Простое окно на IP: форма публичная, без ограничения её зальют спамом. */
const RATE_LIMIT = { windowMs: 60_000, max: 5 };
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT.windowMs);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > RATE_LIMIT.max;
}

/** Номер вида #1042 — сквозной, его называют в переписке. */
async function nextNum(): Promise<string> {
  const last = await prisma.lead.findFirst({ orderBy: { id: 'desc' }, select: { id: true } });
  return `#${1000 + (last?.id ?? 0) + 1}`;
}

export async function POST(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';

  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: 'Слишком много заявок подряд. Попробуйте через минуту.' },
      { status: 429 },
    );
  }

  const parsed = leadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Проверьте поля формы', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const data = parsed.data;

  // Ловушка для ботов сработала — отвечаем как при успехе, чтобы не подсказывать.
  if (data.website) return NextResponse.json({ ok: true });

  const stage = await prisma.stage.findFirst({ orderBy: { order: 'asc' } });
  if (!stage) {
    return NextResponse.json({ error: 'CRM не настроена: нет ни одной стадии' }, { status: 500 });
  }

  const lead = await prisma.lead.create({
    data: {
      num: await nextNum(),
      fio: data.fio,
      phone: data.phone,
      email: data.email || null,
      org: data.org || null,
      inn: data.inn || null,
      comment: data.comment || null,
      subject: data.subject || null,
      sourceUrl: data.sourceUrl || null,
      stageId: stage.id,
      events: {
        create: {
          kind: 'system',
          authorName: 'Система',
          text: `Заявка получена с сайта${data.sourceUrl ? ` (${data.sourceUrl})` : ''}`,
        },
      },
    },
    select: { num: true },
  });

  return NextResponse.json({ ok: true, num: lead.num });
}

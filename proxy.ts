import { NextResponse, type NextRequest } from 'next/server';

/**
 * Разделение сайта и CRM по доменам. Приложение одно, адресов два.
 *
 * Пока CRM_HOST не задан, прокси ничего не делает — всё работает на одном
 * домене, как раньше. Когда домен CRM появится, он прописывается в окружении
 * контейнера, и разделение включается без правки кода.
 *
 * Зачем: без него весь публичный сайт открывался бы и на домене CRM — поиск
 * получил бы полную копию сайта на втором адресе, — а вход в CRM оставался бы
 * доступен на публичном домене.
 */
export function proxy(request: NextRequest) {
  const crmHost = process.env.CRM_HOST?.trim().toLowerCase();
  if (!crmHost) return NextResponse.next();

  const host = (request.headers.get('host') ?? '').split(':')[0].toLowerCase();
  const { pathname, search } = request.nextUrl;
  const isCrm =
    pathname === '/crm' || pathname.startsWith('/crm/') || pathname.startsWith('/api/crm/');

  // Публичный домен: CRM здесь не отвечает.
  if (host !== crmHost) {
    return isCrm ? new NextResponse(null, { status: 404 }) : NextResponse.next();
  }

  // Домен CRM закрыт от поиска целиком.
  if (pathname === '/robots.txt') {
    return new NextResponse('User-agent: *\nDisallow: /\n', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
  if (pathname === '/') return NextResponse.redirect(`https://${crmHost}/crm/`);

  // CRM показывает фото новостей и иконку — их тоже отдаём здесь.
  if (isCrm || pathname.startsWith('/media/') || pathname === '/favicon.ico' || pathname.startsWith('/icon')) {
    return NextResponse.next();
  }

  // Остальное — адреса сайта: уводим на публичный домен, чтобы не плодить дубли.
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  return site
    ? NextResponse.redirect(new URL(pathname + search, site), 301)
    : new NextResponse(null, { status: 404 });
}

export const config = {
  // Статика сборки нужна обоим доменам — её прокси не трогает.
  matcher: ['/((?!_next/static|_next/image).*)'],
};

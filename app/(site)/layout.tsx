import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteMotion } from '@/components/SiteMotion';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteMotion />
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </>
  );
}

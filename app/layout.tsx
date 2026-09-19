import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Busca Vagas — seu próximo passo começa aqui',
  description: 'Encontre vagas Front-end, Full Stack e UI/UX, compare competências e prepare seu currículo para cada oportunidade.',
  icons: { icon: '/icon.png' },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}

import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'Detal — Interaktiv katalog va admin',description:'Chizmalardan ehtiyot qismlarni topish va katalogni boshqarish.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="uz"><body>{children}</body></html>}

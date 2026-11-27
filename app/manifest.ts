import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'הכלבלב של רז',
    short_name: 'הכלבלב',
    start_url: '/',
    display: 'fullscreen',
    orientation: 'any',
    background_color: '#e0f2fe',
    theme_color: '#e0f2fe',
    lang: 'he',
    dir: 'rtl',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}

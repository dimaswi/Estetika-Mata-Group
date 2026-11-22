const getBackendOrigin = (): string => {
  const envUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (envUrl) {
    return envUrl.replace(/\/api\/?$/, '');
  }
  if (
    typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
  ) {
    return '';
  }
  return 'http://localhost:8080';
};

export const resolveBackendAssetUrl = (rawUrl?: string | null, fallback = '/logo.png'): string => {
  if (!rawUrl || rawUrl.includes('1.png') || rawUrl.includes('/vite.svg')) {
    return fallback;
  }
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('data:')) {
    return rawUrl;
  }
  const origin = getBackendOrigin();
  if (rawUrl.startsWith('/uploads/')) {
    return `${origin}${rawUrl}`;
  }
  if (rawUrl.startsWith('/')) {
    return rawUrl;
  }
  return `${origin}/${rawUrl}`;
};

export const setPageTitle = (pageTitle: string) => {
  const appName = localStorage.getItem('appName') || 'PT Estetika Mata Group';
  document.title = `${pageTitle} - ${appName}`;
};

export const getAppName = () => {
  return localStorage.getItem('appName') || 'PT Estetika Mata Group';
};

export const getAppSubtitle = () => {
  return localStorage.getItem('appSubtitle') || 'Estetika Mata Group';
};

export const updateFavicon = (faviconUrl?: string) => {
  const raw = faviconUrl || localStorage.getItem('appFavicon') || localStorage.getItem('appLogo');
  const url = resolveBackendAssetUrl(raw, '/logo.png');

  let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.type = 'image/png';
  link.href = url;
};

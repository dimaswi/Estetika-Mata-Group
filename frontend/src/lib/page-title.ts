/**
 * Utility function to set page title dynamically
 * @param pageTitle - The title of the current page
 */
export const setPageTitle = (pageTitle: string) => {
  const appName = localStorage.getItem('appName') || 'DimsKits';
  document.title = `${pageTitle} - ${appName}`;
};

/**
 * Get application name from localStorage
 */
export const getAppName = () => {
  return localStorage.getItem('appName') || 'DimsKits';
};

/**
 * Get application subtitle from localStorage
 */
export const getAppSubtitle = () => {
  return localStorage.getItem('appSubtitle') || 'Dims Webs';
};

/**
 * Dynamically update the browser tab favicon
 */
export const updateFavicon = (faviconUrl?: string) => {
  let url = faviconUrl || localStorage.getItem('appFavicon') || localStorage.getItem('appLogo') || '/logo.png';
  if (!url || url.includes('/vite.svg')) {
    url = '/logo.png';
  }
  if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('data:') && !url.startsWith('/')) {
    url = `http://localhost:8080/${url}`;
  } else if (url.startsWith('/uploads/')) {
    url = `http://localhost:8080${url}`;
  }

  let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.type = 'image/png';
  link.href = url;
};

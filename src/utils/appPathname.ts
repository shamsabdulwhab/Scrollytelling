/**
 * Normalizes `location.pathname` for route checks when Vite `base` may or may not be
 * reflected in the path (e.g. basename empty vs `/Scrollytelling`).
 */
export function appPathnameFromLocation(pathname: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  const p = pathname.replace(/\/$/, '') || '/'
  if (!base || base === '/') {
    return p
  }
  if (p === base || p.startsWith(`${base}/`)) {
    const rest = p === base ? '/' : p.slice(base.length) || '/'
    return rest.startsWith('/') ? rest : `/${rest}`
  }
  return p
}

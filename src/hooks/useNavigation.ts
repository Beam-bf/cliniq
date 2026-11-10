import { useCallback, useEffect, useState } from 'react';

export const PAGES = { overview: 'Overview', planner: 'Planner', decisions: 'Decisions', evidence: 'Evidence', history: 'History', help: 'Help', account: 'Account' } as const;
export type Page = keyof typeof PAGES;
function readRoute() {
  const [name, query] = window.location.hash.slice(1).split('?');
  return { page: Object.prototype.hasOwnProperty.call(PAGES, name) ? name as Page : 'overview' as Page,
    source: new URLSearchParams(query).get('source') };
}
export function useNavigation() {
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    const update = () => setRoute(readRoute());
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  useEffect(() => { document.title = `${PAGES[route.page]}, ClinIQ`; }, [route.page]);
  const navigate = useCallback((page: Page, source?: string) => {
    window.location.hash = `${page}${source ? `?source=${encodeURIComponent(source)}` : ''}`;
    setRoute({ page, source: source ?? null });
  }, []);
  return { ...route, navigate };
}

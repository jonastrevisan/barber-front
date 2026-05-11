/**
 * Extrai o slug do tenant a partir do subdomínio da URL.
 * Ex: barbearia-joao.barber.app → "barbearia-joao"
 * Ex: barbearia-joao.localhost  → "barbearia-joao" (dev)
 * Fallback dev: variável NEXT_PUBLIC_DEV_TENANT_SLUG no .env.local
 */
export function getTenantSlug(): string {
  if (typeof window === 'undefined') return '';

  const hostname = window.location.hostname;
  const parts = hostname.split('.');

  if (parts.length >= 2 && parts[0] !== 'www' && parts[0] !== 'localhost') {
    return parts[0];
  }

  // fallback para dev sem subdomínio (ex: localhost:3000)
  return process.env.NEXT_PUBLIC_DEV_TENANT_SLUG || '';
}

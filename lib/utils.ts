const backendOrigin = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/api\/?$/, '');

/** Máscara (XX) XXXXX-XXXX ou (XX) XXXX-XXXX enquanto digita (até 11 dígitos BR). */
export function maskBrazilPhoneInput(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  const ddd = d.slice(0, 2);
  const rest = d.slice(2);
  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  if (d.length <= 10) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
}

/** Telefone só com dígitos, ou `undefined` se vazio. */
export function phoneDigitsOnly(value: string): string | undefined {
  const digits = value.replace(/\D/g, '');
  return digits.length > 0 ? digits : undefined;
}

export function avatarSrc(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${backendOrigin}${path}`;
}

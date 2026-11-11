/** Turn whatever was typed (a URL, a username, @username) into a link and a short label. */
export interface SocialLink { href: string; label: string }

const clean = (v: string | undefined) => (v ?? '').trim().replace(/^@/, '').replace(/\/+$/, '')

function fromUrl(v: string, host: RegExp): string | null {
  const m = v.match(/^(?:https?:\/\/)?(?:[\w-]+\.)?([\w-]+\.com)(\/.*)?$/i)
  if (!m || !host.test(m[1])) return null
  return m[2] ?? ''
}

export function linkedinLink(raw: string | undefined): SocialLink | null {
  const v = clean(raw)
  if (!v) return null
  const path = fromUrl(v, /^linkedin\.com$/i)
  if (path !== null) {
    const handle = path.match(/^\/(?:in|company)\/([^/?#]+)/)?.[1]
    return { href: `https://www.linkedin.com${path}`, label: handle ? decodeURIComponent(handle) : 'LinkedIn' }
  }
  return { href: `https://www.linkedin.com/in/${encodeURIComponent(v)}`, label: v }
}

export function instagramLink(raw: string | undefined): SocialLink | null {
  const v = clean(raw)
  if (!v) return null
  const path = fromUrl(v, /^instagram\.com$/i)
  if (path !== null) {
    const handle = path.match(/^\/([^/?#]+)/)?.[1]
    return { href: `https://www.instagram.com${path}`, label: handle ? '@' + handle : 'Instagram' }
  }
  return { href: `https://www.instagram.com/${encodeURIComponent(v)}`, label: '@' + v }
}

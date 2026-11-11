import { describe, expect, it } from 'vitest'
import { instagramLink, linkedinLink } from './social'

describe('social links', () => {
  it('builds LinkedIn links from a username or a URL', () => {
    expect(linkedinLink('maya-l')).toEqual({ href: 'https://www.linkedin.com/in/maya-l', label: 'maya-l' })
    expect(linkedinLink('https://www.linkedin.com/in/maya-l/')).toEqual({ href: 'https://www.linkedin.com/in/maya-l', label: 'maya-l' })
    expect(linkedinLink('linkedin.com/in/sam')).toEqual({ href: 'https://www.linkedin.com/in/sam', label: 'sam' })
    expect(linkedinLink('  ')).toBeNull()
  })

  it('builds Instagram links from @username or a URL', () => {
    expect(instagramLink('@maya.climbs')).toEqual({ href: 'https://www.instagram.com/maya.climbs', label: '@maya.climbs' })
    expect(instagramLink('https://instagram.com/maya.climbs?igsh=x')).toEqual({ href: 'https://www.instagram.com/maya.climbs?igsh=x', label: '@maya.climbs' })
    expect(instagramLink('')).toBeNull()
  })
})

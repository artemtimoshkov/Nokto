/**
 * Keeps CSS variables in sync with the *visual* viewport — the part of the
 * screen not covered by the on-screen keyboard. iOS doesn't resize the page
 * when the keyboard opens, so sheets use these to sit right above it.
 */
export function trackVisualViewport() {
  const vv = window.visualViewport
  const root = document.documentElement
  const update = () => {
    const h = vv ? vv.height : window.innerHeight
    const top = vv ? vv.offsetTop : 0
    root.style.setProperty('--vvh', `${h}px`)
    root.style.setProperty('--vvt', `${top}px`)
    // Keyboard open: the visible area is noticeably shorter than the window.
    root.classList.toggle('kb-open', window.innerHeight - h > 120)
  }
  update()
  vv?.addEventListener('resize', update)
  vv?.addEventListener('scroll', update)
  window.addEventListener('resize', update)
}

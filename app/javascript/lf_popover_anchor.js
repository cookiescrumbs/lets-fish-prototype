// Positions the popover bubbles. Pages <script src> this next to
// components.css; on the Rails port include it once in the layout.
//
// .lf-tooltip — ALWAYS positioned here (all browsers): centred over its
//   trigger, then clamped inside the viewport so a bubble on an edge-hugging
//   ⓘ can't hang off-screen on phones; --lf-tooltip-arrow-x keeps the caret
//   pointing at the trigger when clamping shifts the bubble off-centre.
//   (Pure-CSS anchor positioning can't do the clamp simply, so one JS code
//   path beats a CSS path plus a fallback.)
// .lf-nav__menu — CSS anchor positioning where supported; this script is the
//   Safari/Firefox fallback only.
//
// Positioned in PAGE coordinates (position: absolute in the top layer
// resolves against the document origin), so bubbles scroll with the page —
// no scroll listeners. Resize DOES move triggers (the page re-lays-out), so
// open bubbles are re-positioned on resize.
//
// ponytail: one placement only (above, centred, clamped). If a bubble ever
// needs to FLIP (open below when the trigger is at the top of the viewport)
// or anchor to something that moves independently of page layout (e.g. a
// Leaflet marker), don't grow this file — switch to Floating UI then.

const MENU_HAS_CSS_ANCHOR = CSS.supports('anchor-name: --a')

function position(pop) {
  const isMenu = pop.matches('.lf-nav__menu')
  if (isMenu && MENU_HAS_CSS_ANCHOR) return // CSS anchors it natively

  // tap-opened bubbles are found via their trigger's popovertarget;
  // app-opened bubbles (nudges) name their trigger with data-anchor="<id>"
  const trigger = document.querySelector(`[popovertarget="${pop.id}"]`) ||
    (pop.dataset.anchor && document.getElementById(pop.dataset.anchor))
  if (!trigger) return

  const r = trigger.getBoundingClientRect()
  pop.style.position = 'absolute'
  pop.style.inset = 'auto'

  if (isMenu) {
    pop.style.top = `${r.bottom + window.scrollY + 8}px`
    pop.style.left = `${r.right + window.scrollX}px`
    pop.style.transform = 'translateX(-100%)'
    return
  }

  const gutter = 8
  const w = pop.getBoundingClientRect().width
  const centre = r.left + r.width / 2
  const left = Math.min(Math.max(centre - w / 2, gutter), window.innerWidth - w - gutter)
  pop.style.left = `${left + window.scrollX}px`
  pop.style.top = `${r.top + window.scrollY}px`
  pop.style.transform = 'translateY(calc(-100% - 8px))'
  pop.style.setProperty('--lf-tooltip-arrow-x', `${centre - left}px`)
}

// `toggle` fires after the popover is rendered, so its size is measurable.
// It doesn't bubble — capture catches it on the way down.
document.addEventListener('toggle', (e) => {
  const pop = e.target
  if (!(pop instanceof HTMLElement) || e.newState !== 'open') return
  if (pop.matches('.lf-tooltip, .lf-nav__menu')) position(pop)
}, true)

// Resize re-lays-out the page and moves triggers — re-anchor open bubbles.
window.addEventListener('resize', () => {
  document.querySelectorAll('.lf-tooltip:popover-open, .lf-nav__menu:popover-open')
    .forEach(position)
})

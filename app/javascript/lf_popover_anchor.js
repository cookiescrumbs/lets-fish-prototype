// Positions the popover bubbles.
//
// .lf-tooltip — ALWAYS positioned here (all browsers) via Floating UI:
//   placement 'top', offset 8, shift() to clamp inside the viewport so a bubble
//   on an edge-hugging ⓘ can't hang off-screen on phones. --lf-tooltip-arrow-x
//   keeps the caret pointing at the trigger when the clamp shifts the bubble
//   off-centre. flip() drops the bubble below the trigger when there's no room
//   above (e.g. the trigger sits in a sticky bar pinned to top:0); the arrow
//   follows via [data-placement="bottom"]. strategy 'fixed' — the bubble paints in the top layer, so
//   viewport coords are the honest frame; we re-run computePosition on scroll
//   and resize so it tracks a trigger that moves (e.g. one in a sticky bar).
//   Caveat of fixed strategy: if a trigger's ancestor ever gains transform /
//   filter / will-change / contain, it becomes the containing block and the
//   bubble offsets by it. None do today; if that changes, wrap the bubble's
//   own positioning in Floating UI autoUpdate or revisit the strategy.
// .lf-nav__menu — native CSS anchor positioning where supported; the position()
//   fallback below is the Safari/Firefox path only, unchanged.
//
// Tracking is a capturing scroll + resize listener that re-runs the positioner
// over open bubbles. No per-bubble lifecycle: a removed bubble simply stops
// being matched by :popover-open, so there's nothing to clean up.
//
// ponytail: scroll/resize-driven, not per-bubble autoUpdate. If a bubble ever
// anchors inside a nested scroll container or needs layout-shift tracking,
// switch that bubble to Floating UI's autoUpdate() then.

import { computePosition, offset, shift, flip, hide } from '@floating-ui/dom'
import { canPosition } from 'utils/popover_anchor'

const MENU_HAS_CSS_ANCHOR = CSS.supports('anchor-name: --a')

async function positionTooltip(pop) {
  // tap-opened bubbles are found via their trigger's popovertarget;
  // app-opened bubbles (nudges) name their trigger with data-anchor="<id>"
  const trigger = document.querySelector(`[popovertarget="${pop.id}"]`) ||
    (pop.dataset.anchor && document.getElementById(pop.dataset.anchor))
  if (!canPosition(trigger)) return

  // Popovers paint in the top layer, above the sticky bar. So a content ⓘ that
  // scrolls up behind the sticky header would leave its bubble hanging over the
  // bar. hide() flags the bubble once its trigger is fully behind the bar —
  // padding the viewport's top edge down by the bar's height. Triggers *in* the
  // sticky bar (save/conditions nudges) are never behind it, so they stay put.
  const bar = document.querySelector('[data-nearby-target="stickyNav"]')
  const barHeight = bar ? bar.getBoundingClientRect().height : 0

  const pos = await computePosition(trigger, pop, {
    placement: 'top',
    strategy: 'fixed',
    middleware: [offset(8), flip(), shift({ padding: 8 }), hide({ padding: { top: barHeight } })],
  })
  Object.assign(pop.style, {
    position: 'fixed', inset: 'auto', transform: 'none',
    left: `${pos.x}px`, top: `${pos.y}px`,
    visibility: pos.middlewareData.hide?.referenceHidden ? 'hidden' : '',
  })
  // flip() may drop the bubble below when there's no room above (e.g. trigger in
  // a sticky bar pinned to top:0). Point the CSS arrow at the trigger accordingly.
  pop.dataset.placement = pos.placement.startsWith('bottom') ? 'bottom' : 'top'

  const t = trigger.getBoundingClientRect()
  pop.style.setProperty('--lf-tooltip-arrow-x', `${t.left + t.width / 2 - pos.x}px`)
}

// Nav menu (Safari/Firefox fallback only) — page coords, unchanged.
function positionMenu(pop) {
  if (MENU_HAS_CSS_ANCHOR) return // CSS anchors it natively
  const trigger = document.querySelector(`[popovertarget="${pop.id}"]`)
  if (!trigger) return

  const r = trigger.getBoundingClientRect()
  pop.style.position = 'absolute'
  pop.style.inset = 'auto'
  pop.style.top = `${r.bottom + window.scrollY + 8}px`
  pop.style.left = `${r.right + window.scrollX}px`
  pop.style.transform = 'translateX(-100%)'
}

// `toggle` fires after the popover is rendered, so its size is measurable.
// It doesn't bubble — capture catches it on the way down.
document.addEventListener('toggle', (e) => {
  const pop = e.target
  if (!(pop instanceof HTMLElement) || e.newState !== 'open') return
  if (pop.matches('.lf-tooltip')) positionTooltip(pop)
  else if (pop.matches('.lf-nav__menu')) positionMenu(pop)
}, true)

// Re-anchor open bubbles. Only fixed-strategy tooltips need scroll tracking —
// the page-coord menu scrolls with the document, so scroll would recompute the
// same value. Capture catches scroll from nested containers too (scroll doesn't
// bubble). Cheap when nothing is open — the querySelectorAll returns empty.
function repositionTooltips() {
  document.querySelectorAll('.lf-tooltip:popover-open').forEach(positionTooltip)
}
function repositionAll() {
  repositionTooltips()
  document.querySelectorAll('.lf-nav__menu:popover-open').forEach(positionMenu)
}
window.addEventListener('scroll', repositionTooltips, { capture: true, passive: true })
window.addEventListener('resize', repositionAll)

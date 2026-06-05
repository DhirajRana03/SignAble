/**
 * Locate the page DOM node under a viewport point. Pages are tagged
 * with `data-page-index` by FieldPlacer's intersection observer; that
 * attribute is the cross-component hook used by:
 *
 *  - FieldChip (cross-page chip moves)
 *  - FieldToolbar (pointer-driven palette drop)
 *
 * Returns the destination page's 1-based number and its bounding rect
 * so callers can compute percent coordinates without re-querying.
 */
export function findPageAtPoint(
  clientX: number,
  clientY: number,
): { pageNumber: number; rect: DOMRect } | null {
  if (typeof document === 'undefined') return null;
  const pageEls = document.querySelectorAll<HTMLElement>('[data-page-index]');
  for (const el of pageEls) {
    const rect = el.getBoundingClientRect();
    if (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    ) {
      const idx = Number(el.dataset.pageIndex);
      if (Number.isNaN(idx)) continue;
      return { pageNumber: idx + 1, rect };
    }
  }
  return null;
}

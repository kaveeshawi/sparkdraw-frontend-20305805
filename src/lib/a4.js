/** A4 paper helpers — same approach as my-invoice-app (210mm × 297mm). */

export const A4_WIDTH_MM = 210
export const A4_HEIGHT_MM = 297
/** CSS px per mm at 96dpi (matches invoice app). */
export const MM_TO_PX = 3.7795275591

export function a4SizePx() {
  return {
    width: A4_WIDTH_MM * MM_TO_PX,
    height: A4_HEIGHT_MM * MM_TO_PX,
  }
}

/**
 * Fit A4 into a box — same formula as invoice create previewScale.
 * @param {number} availableWidth
 * @param {number} availableHeight
 * @param {number} [maxScale=0.65]
 */
export function fitA4Scale(availableWidth, availableHeight, maxScale = 0.65) {
  const { width, height } = a4SizePx()
  if (availableWidth < 8 || availableHeight < 8) return 0.4
  const byW = availableWidth / width
  const byH = availableHeight / height
  return Math.max(0.12, Math.min(byW, byH, maxScale))
}

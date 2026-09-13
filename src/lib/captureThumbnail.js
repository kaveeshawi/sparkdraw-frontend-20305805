/** Capture a JPG data-URL thumbnail from a DOM page node (editor canvas). */
export async function capturePageThumbnail(pageNode) {
  if (!pageNode) return null
  const html2canvas = (await import('html2canvas')).default
  const canvas = await html2canvas(pageNode, {
    backgroundColor: '#ffffff',
    scale: 0.9,
    useCORS: true,
    logging: false,
  })
  return canvas.toDataURL('image/jpeg', 0.72)
}

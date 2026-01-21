import jsPDF from 'jspdf';
import { Canvg } from 'canvg';

/**
 * Adds an SVG string to a jsPDF document by first converting it to a high-res PNG canvas.
 */
export async function addSvgToPdf(
  doc: jsPDF, 
  svgString: string, 
  x: number, 
  y: number, 
  width: number, 
  height: number
) {
  // Create a virtual canvas
  const canvas = document.createElement('canvas');
  
  // Set canvas size (Scale up by 3x for high DPI print quality)
  const scale = 3; 
  canvas.width = width * scale * 3.78; // Approx conversion factor for mm to pixels
  canvas.height = height * scale * 3.78;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Render SVG to Canvas
  try {
    const v = await Canvg.from(ctx, svgString);
    
    // Resize the SVG rendering to fit our scaled canvas
    v.resize(canvas.width, canvas.height);
    
    await v.render();

    // Get PNG data
    const imgData = canvas.toDataURL('image/png');
    
    // Add to PDF
    doc.addImage(imgData, 'PNG', x, y, width, height);
  } catch (e) {
    console.error("Failed to render SVG to PDF", e);
  }
}

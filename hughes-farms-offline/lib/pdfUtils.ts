import jsPDF from 'jspdf';
import { Canvg } from 'canvg';

// This is our new function to add SVG images to a PDF
export async function addSvgToPdf(
  doc: jsPDF, 
  svgString: string, 
  x: number, 
  y: number, 
  width: number, 
  height: number
) {
  // Create a virtual canvas to draw on
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Use canvg to render the SVG onto the canvas
  const v = await Canvg.from(ctx, svgString);
  await v.render();

  // Get the image data from the canvas
  const imgData = canvas.toDataURL('image/png');
  
  // Add the resulting PNG data to the PDF
  doc.addImage(imgData, 'PNG', x, y, width, height);
}

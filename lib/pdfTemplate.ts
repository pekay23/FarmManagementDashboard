import jsPDF from 'jspdf';

// ═══════════════════════════════════════════════════════════
// FieldOps Professional PDF Template System
// ═══════════════════════════════════════════════════════════

// --- Brand Constants ---
export const PDF_BRAND = {
  primary: [5, 150, 105] as [number, number, number],     // Emerald #059669
  primaryDark: [4, 120, 87] as [number, number, number],   // Darker emerald
  accent: [245, 158, 11] as [number, number, number],      // Amber #F59E0B
  dark: [17, 24, 39] as [number, number, number],          // Near black
  text: [55, 65, 81] as [number, number, number],          // Gray-700
  muted: [107, 114, 128] as [number, number, number],      // Gray-500
  light: [243, 244, 246] as [number, number, number],      // Gray-100
  white: [255, 255, 255] as [number, number, number],
  tableAlt: [245, 250, 245] as [number, number, number],   // Soft green tint
  sectionBg: [236, 253, 245] as [number, number, number],  // Emerald-50
};

// --- Logo Helpers ---

/** Max logo dimensions for PDF output */
export const LOGO_MAX_WIDTH = 200;
export const LOGO_MAX_HEIGHT = 200;
export const LOGO_MAX_BYTES = 500 * 1024; // 500KB

/**
 * Get the farm logo from localStorage settings.
 * Returns null if no logo uploaded.
 */
export function getFarmLogo(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem('farmSettings');
    if (saved) {
      const settings = JSON.parse(saved);
      return settings.logo || null;
    }
  } catch {
    // ignore parse errors
  }
  return null;
}

/**
 * Get farm settings from localStorage.
 */
export function getFarmSettings(): Record<string, any> {
  if (typeof window === 'undefined') return {};
  try {
    const saved = localStorage.getItem('farmSettings');
    if (saved) return JSON.parse(saved);
  } catch {
    // ignore
  }
  return {};
}

/**
 * Validate and resize an uploaded logo image.
 * Returns a base64 data URL (PNG) that fits within LOGO_MAX_WIDTH x LOGO_MAX_HEIGHT.
 * Throws an error string if validation fails.
 */
export async function fetchBase64Image(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export function processLogoUpload(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject('Please upload a PNG or JPEG image.');
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      reject(`Logo must be under ${Math.round(LOGO_MAX_BYTES / 1024)}KB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // Resize to fit within max bounds while preserving aspect ratio
        let w = img.width;
        let h = img.height;
        if (w > LOGO_MAX_WIDTH || h > LOGO_MAX_HEIGHT) {
          const ratio = Math.min(LOGO_MAX_WIDTH / w, LOGO_MAX_HEIGHT / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject('Canvas error.'); return; }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject('Invalid image file.');
      img.src = reader.result as string;
    };
    reader.onerror = () => reject('Failed to read file.');
    reader.readAsDataURL(file);
  });
}

// --- PDF Building Blocks ---

interface HeaderOptions {
  doc: jsPDF;
  title: string;
  subtitle?: string;
  refLabel?: string;
  refValue?: string;
  dateStr?: string;
  logoData?: string | null;
  farmName?: string;
  settingsData?: any;
}

/**
 * Render a professional PDF header with farm branding.
 * Returns the Y position after the header for content to start.
 */
export function renderHeader(opts: HeaderOptions): number {
  const { doc, title, subtitle, refLabel, refValue, dateStr, settingsData } = opts;
  const logo = opts.logoData || getFarmLogo();
  const settings = settingsData || getFarmSettings();
  const farmName = opts.farmName || settings.farm_name || 'FieldOps Farm';

  // White Background with soft rounded border for a clean header
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(229, 231, 235); // border-gray-200
  doc.roundedRect(10, 10, 190, 40, 3, 3, 'FD');

  // Accent line on the left edge
  doc.setFillColor(...PDF_BRAND.primary);
  doc.roundedRect(10, 10, 4, 40, 2, 2, 'F');
  // Overlap to make only the left edge rounded
  doc.rect(12, 10, 2, 40, 'F');

  // Logo
  let textStartX = 20;
  if (logo) {
    try {
      doc.addImage(logo, 'PNG', 18, 16, 28, 28);
      textStartX = 52;
    } catch {
      // logo failed to render, continue without
    }
  }

  // Farm name
  doc.setTextColor(...PDF_BRAND.dark);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(farmName.toUpperCase(), textStartX, 22);

  // Slogan
  doc.setTextColor(...PDF_BRAND.primaryDark);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text("Rooted in nature, powered by innovation", textStartX, 27);

  // Farm details line
  const showContact = settings.show_contact_on_pdf !== undefined ? settings.show_contact_on_pdf : true;
  if (showContact) {
      doc.setTextColor(...PDF_BRAND.muted);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const details: string[] = [];
      if (settings.address) details.push(settings.address);
      if (settings.phone) details.push(`Tel: ${settings.phone}`);
      if (settings.email) details.push(settings.email);
      if (settings.working_hours) details.push(`Hours: ${settings.working_hours}`);
      if (details.length > 0) {
        doc.text(details.join('  ·  '), textStartX, 35);
      }
  }

  // Document title (right side)
  doc.setTextColor(...PDF_BRAND.primaryDark);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title.toUpperCase(), 193, 23, { align: 'right' });

  // Reference / date info
  doc.setTextColor(...PDF_BRAND.text);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  let currentY = 31;
  if (refLabel && refValue) {
    doc.text(`${refLabel}: ${refValue}`, 193, currentY, { align: 'right' });
    currentY += 6;
  }
  doc.text(`Date: ${dateStr || new Date().toLocaleDateString()}`, 193, currentY, { align: 'right' });
  if (subtitle) {
    currentY += 6;
    doc.text(subtitle, 193, currentY, { align: 'right' });
  }

  return 60; // Y position after header
}

interface FooterOptions {
  doc: jsPDF;
  customMessage?: string;
}

/**
 * Render professional footers on all pages of a PDF.
 */
export function renderFooters(opts: FooterOptions): void {
  const { doc, customMessage } = opts;
  const pageCount = (doc as any).internal.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Separator line
    doc.setDrawColor(...PDF_BRAND.light);
    doc.setLineWidth(0.5);
    doc.line(15, 282, 195, 282);

    // Left: custom message or "Generated by FieldOps"
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...PDF_BRAND.muted);
    doc.text(customMessage || 'Generated by FieldOps', 15, 287);

    // Center: timestamp
    doc.setFont('helvetica', 'normal');
    doc.text(new Date().toLocaleString(), 105, 287, { align: 'center' });

    // Right: page number
    doc.text(`Page ${i} of ${pageCount}`, 195, 287, { align: 'right' });
  }
}

/**
 * Render a section title with accent bar.
 */
export function renderSectionTitle(doc: jsPDF, title: string, y: number): number {
  // Accent bar
  doc.setFillColor(...PDF_BRAND.primary);
  doc.rect(15, y, 3, 6, 'F');

  // Title text
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF_BRAND.dark);
  doc.text(title, 22, y + 5);

  return y + 12;
}

/**
 * Render a key-value detail row (for profile cards).
 */
export function renderDetailRow(doc: jsPDF, label: string, value: string, x: number, y: number): void {
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF_BRAND.muted);
  doc.text(label.toUpperCase(), x, y);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...PDF_BRAND.dark);
  doc.text(value || '—', x, y + 5);
}

/**
 * Common autoTable head styles matching the brand.
 */
export const TABLE_HEAD_STYLES = {
  fillColor: PDF_BRAND.primary,
  textColor: PDF_BRAND.white,
  fontStyle: 'bold' as const,
  fontSize: 9,
};

export const TABLE_STYLES = {
  cellPadding: 3.5,
  fontSize: 9,
  textColor: PDF_BRAND.text,
};

export const TABLE_ALT_ROW_STYLES = {
  fillColor: PDF_BRAND.tableAlt,
};

// --- NATIVE CHART ENGINE ---

export interface ChartData {
  name: string;
  value: number;
}

export interface ChartOptions {
  doc: jsPDF;
  title: string;
  data: ChartData[];
  startY: number;
  unit?: string;
}

/**
 * Draws a lightweight, crisp vector horizontal bar chart natively in the PDF.
 */
export function renderBarChart(opts: ChartOptions): number {
  const { doc, title, data, startY, unit = '' } = opts;
  const MARGIN_X = 14;
  const MAX_BAR_WIDTH = 110;
  
  if (!data || data.length === 0) return startY;

  // Title
  doc.setTextColor(...PDF_BRAND.dark);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(title.toUpperCase(), MARGIN_X, startY);

  const maxValue = Math.max(...data.map(d => d.value), 1);
  let currentY = startY + 8;
  const BAR_HEIGHT = 5;
  const SPACING = 4;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  data.slice(0, 10).forEach((item) => { // limit to top 10 to avoid overflowing pages
    // Label (left aligned)
    doc.setTextColor(...PDF_BRAND.text);
    const label = item.name.length > 25 ? item.name.substring(0, 22) + '...' : item.name;
    doc.text(label, MARGIN_X, currentY + 4);

    // Bar
    const barWidth = (item.value / maxValue) * MAX_BAR_WIDTH;
    doc.setFillColor(...PDF_BRAND.primary);
    doc.roundedRect(MARGIN_X + 45, currentY, Math.max(barWidth, 1.5), BAR_HEIGHT, 1, 1, 'F');

    // Value Text
    doc.setTextColor(...PDF_BRAND.muted);
    const valueText = unit.includes('GH') ? `${unit}${item.value.toLocaleString()}` : `${item.value.toLocaleString()} ${unit}`.trim();
    doc.text(valueText, MARGIN_X + 48 + barWidth, currentY + 4);

    currentY += BAR_HEIGHT + SPACING;
  });

  return currentY + 5;
}

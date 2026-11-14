import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

/**
 * High-definition Bengali PDF exporter using html-to-image & jsPDF.
 * Uses native browser SVG foreignObject rendering, supporting all modern CSS color
 * functions (including oklch, rgb, hsl) and 100% accurate Bengali font ligatures.
 */

/**
 * Download Cash Memo / Invoice as Standard A4 or Compact PDF
 */
export async function downloadReceiptPDF(
  elementId: string,
  invoiceNumber: string,
  isA4Format: boolean = true
): Promise<boolean> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error('Element not found for PDF generation:', elementId);
    return false;
  }

  try {
    const dataUrl = await toPng(element, {
      quality: 1,
      pixelRatio: 2.5,
      backgroundColor: '#ffffff',
      cacheBust: true,
    });

    const img = new Image();
    img.src = dataUrl;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    const a4Width = 210; // mm
    const a4Height = 297; // mm

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Pure white paper background for printer-friendly Cash Memo with black text
    doc.setFillColor(255, 255, 255); // #FFFFFF
    doc.rect(0, 0, a4Width, a4Height, 'F');

    // Calculate scaling to fit neatly inside A4 margins
    const margin = 10; // 10mm margins
    const printableWidth = a4Width - margin * 2;
    const computedHeight = (img.height * printableWidth) / img.width;

    // Center image on A4 page
    const yOffset = computedHeight < a4Height - margin * 2 ? margin : margin;

    doc.addImage(dataUrl, 'PNG', margin, yOffset, printableWidth, Math.min(computedHeight, a4Height - margin * 2));
    doc.save(`ইনভয়েস-${invoiceNumber}-A4.pdf`);
    return true;
  } catch (err) {
    console.error('Failed to generate Receipt PDF:', err);
    return false;
  }
}

/**
 * Download Professional A4 Restaurant Sales & Financial Report PDF
 */
export async function downloadA4SalesReportPDF(
  elementId: string,
  reportTitle: string = 'বিক্রি-রিপোর্ট'
): Promise<boolean> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error('Report element not found for PDF export:', elementId);
    return false;
  }

  try {
    const dataUrl = await toPng(element, {
      quality: 1,
      pixelRatio: 2.8,
      backgroundColor: '#0B0F17',
      cacheBust: true,
    });

    const img = new Image();
    img.src = dataUrl;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    const a4Width = 210; // mm
    const a4Height = 297; // mm
    const margin = 10; // 10mm margin
    const contentWidth = a4Width - margin * 2;
    const contentHeight = (img.height * contentWidth) / img.width;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Fill dark executive page background
    doc.setFillColor(11, 15, 23); // #0B0F17
    doc.rect(0, 0, a4Width, a4Height, 'F');

    // Check if multi-page is required or single A4 page
    if (contentHeight <= a4Height - margin * 2) {
      // Fits on a single A4 page perfectly
      doc.addImage(dataUrl, 'PNG', margin, margin, contentWidth, contentHeight);
    } else {
      // Multi-page A4 handling
      let heightLeft = contentHeight;
      let position = margin;
      const pageUsableHeight = a4Height - margin * 2;

      doc.addImage(dataUrl, 'PNG', margin, position, contentWidth, contentHeight);
      heightLeft -= pageUsableHeight;

      while (heightLeft > 0) {
        position = heightLeft - contentHeight + margin;
        doc.addPage('a4', 'portrait');
        doc.setFillColor(11, 15, 23); // #0B0F17
        doc.rect(0, 0, a4Width, a4Height, 'F');
        doc.addImage(dataUrl, 'PNG', margin, position, contentWidth, contentHeight);
        heightLeft -= pageUsableHeight;
      }
    }

    const cleanTitle = reportTitle.replace(/[/\\?%*:|"<>]/g, '-');
    doc.save(`${cleanTitle}-A4.pdf`);
    return true;
  } catch (err) {
    console.error('Failed to export A4 Sales Report PDF:', err);
    return false;
  }
}

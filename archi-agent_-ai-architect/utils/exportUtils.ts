import { jsPDF } from 'jspdf';
import type { GeneratedPlan, ProjectConfig } from '../types';

export function exportSvgAsPng(svgElement: SVGSVGElement, filename = 'floor-plan.png'): void {
  const clone = svgElement.cloneNode(true) as SVGSVGElement;
  const viewBox = svgElement.viewBox.baseVal;
  const scale = 3;
  const width = viewBox.width * 40 * scale;
  const height = viewBox.height * 40 * scale;

  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clone);
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    URL.revokeObjectURL(url);

    canvas.toBlob((pngBlob) => {
      if (!pngBlob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(pngBlob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    }, 'image/png');
  };
  img.src = url;
}

function svgToDataUrl(svgElement: SVGSVGElement, width: number, height: number): Promise<string> {
  return new Promise((resolve) => {
    const clone = svgElement.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('width', String(width));
    clone.setAttribute('height', String(height));

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clone);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = url;
  });
}

export async function exportPlanAsPdf(
  svgElement: SVGSVGElement,
  plan: GeneratedPlan,
  config?: ProjectConfig | null,
  filename = 'floor-plan-report.pdf'
): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // --- Page 1: Title + Floor Plan Image ---
  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Floor Plan Report', margin, 25);

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Generated: ${new Date().toLocaleDateString()}`, margin, 33);
  if (config) {
    pdf.text(`Project: ${config.projectType} | Plot: ${config.width}m x ${config.depth}m`, margin, 39);
  }

  // Render SVG to image
  const viewBox = svgElement.viewBox.baseVal;
  const aspectRatio = viewBox.width / viewBox.height;
  const imgWidth = contentWidth;
  const imgHeight = imgWidth / aspectRatio;
  const dataUrl = await svgToDataUrl(svgElement, imgWidth * 4, imgHeight * 4);
  pdf.addImage(dataUrl, 'PNG', margin, 45, imgWidth, Math.min(imgHeight, 200));

  // --- Page 2: Room Schedule ---
  pdf.addPage();
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Room Schedule', margin, 20);

  const builtRooms = plan.rooms.filter(r => r.type === 'room' || r.type === 'service' || r.type === 'circulation');
  let yPos = 30;

  // Table header
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setFillColor(240, 240, 240);
  pdf.rect(margin, yPos - 4, contentWidth, 8, 'F');
  pdf.text('Name', margin + 2, yPos);
  pdf.text('Type', margin + 55, yPos);
  pdf.text('Dimensions', margin + 95, yPos);
  pdf.text('Area (m²)', margin + 140, yPos);
  yPos += 8;

  pdf.setFont('helvetica', 'normal');
  for (const room of builtRooms) {
    if (yPos > pageHeight - 20) {
      pdf.addPage();
      yPos = 20;
    }
    pdf.text(room.name, margin + 2, yPos);
    pdf.text(room.type, margin + 55, yPos);
    pdf.text(`${room.width}m x ${room.height}m`, margin + 95, yPos);
    pdf.text((room.width * room.height).toFixed(1), margin + 140, yPos);
    yPos += 6;
  }

  // --- Page 3: Compliance Summary ---
  pdf.addPage();
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Compliance Summary', margin, 20);
  yPos = 30;

  pdf.setFontSize(12);
  pdf.text('Regulatory Checks', margin, yPos);
  yPos += 8;
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  for (const item of plan.compliance.regulatory) {
    if (yPos > pageHeight - 20) { pdf.addPage(); yPos = 20; }
    const status = item.status === 'PASS' ? '[PASS]' : item.status === 'WARN' ? '[WARN]' : '[FAIL]';
    pdf.text(`${status} ${item.rule}: ${item.message}`, margin + 2, yPos, { maxWidth: contentWidth - 4 });
    yPos += 6;
  }

  yPos += 6;
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Cultural Checks', margin, yPos);
  yPos += 8;
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  for (const item of plan.compliance.cultural) {
    if (yPos > pageHeight - 20) { pdf.addPage(); yPos = 20; }
    const status = item.status === 'PASS' ? '[PASS]' : '[FAIL]';
    pdf.text(`${status} ${item.rule}: ${item.message}`, margin + 2, yPos, { maxWidth: contentWidth - 4 });
    yPos += 6;
  }

  // --- Page 4: BOM & Cost ---
  pdf.addPage();
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Bill of Materials & Cost Estimate', margin, 20);
  yPos = 30;

  if (plan.totalCostRange) {
    pdf.setFontSize(11);
    const curr = plan.totalCostRange.currency || 'INR';
    pdf.text(`Estimated Cost: ${curr} ${plan.totalCostRange.min.toLocaleString()} - ${plan.totalCostRange.max.toLocaleString()}`, margin, yPos);
    yPos += 10;
  }

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setFillColor(240, 240, 240);
  pdf.rect(margin, yPos - 4, contentWidth, 8, 'F');
  pdf.text('Material', margin + 2, yPos);
  pdf.text('Quantity', margin + 70, yPos);
  pdf.text('Unit', margin + 110, yPos);
  pdf.text('Est. Cost', margin + 140, yPos);
  yPos += 8;

  pdf.setFont('helvetica', 'normal');
  for (const item of plan.bom) {
    if (yPos > pageHeight - 20) { pdf.addPage(); yPos = 20; }
    pdf.text(item.material, margin + 2, yPos, { maxWidth: 65 });
    pdf.text(item.quantity, margin + 70, yPos);
    pdf.text(item.unit, margin + 110, yPos);
    pdf.text(item.estimatedCost.toLocaleString(), margin + 140, yPos);
    yPos += 6;
  }

  // --- Page 5: Design Log ---
  if (plan.designLog && plan.designLog.length > 0) {
    pdf.addPage();
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Design Log', margin, 20);
    yPos = 30;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    for (const log of plan.designLog) {
      if (yPos > pageHeight - 20) { pdf.addPage(); yPos = 20; }
      pdf.text(`• ${log}`, margin + 2, yPos, { maxWidth: contentWidth - 4 });
      yPos += 6;
    }
  }

  pdf.save(filename);
}

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

export type InvoicePdfModel = {
  studio: string;
  number: string;
  status: string;
  issueDate: string;
  dueDate: string;
  clientName: string;
  clientEmail: string | null;
  notes: string | null;
  items: { description: string; quantity: string; unitPrice: string; total: string }[];
  subtotal: string;
  taxLabel: string;
  tax: string;
  total: string;
};

const INK = rgb(0.11, 0.09, 0.08);
const MUTED = rgb(0.42, 0.38, 0.34);
const COPPER = rgb(0.72, 0.35, 0.16);
const LINE = rgb(0.86, 0.82, 0.76);

function wrap(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

export async function renderInvoicePdf(model: InvoicePdfModel) {
  const doc = await PDFDocument.create();
  const serif = await doc.embedFont(StandardFonts.TimesRoman);
  const sans = await doc.embedFont(StandardFonts.Helvetica);
  const sansBold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage([612, 792]);
  let y = 748;

  const draw = (
    target: PDFPage,
    text: string,
    x: number,
    size: number,
    font: PDFFont,
    color = INK,
  ) => {
    target.drawText(text, { x, y, size, font, color });
  };

  const ensure = (needed: number) => {
    if (y - needed > 56) return;
    page = doc.addPage([612, 792]);
    y = 748;
  };

  draw(page, "DealFlow", 48, 11, sansBold, COPPER);
  y -= 28;
  draw(page, model.studio, 48, 22, serif);
  y -= 18;
  draw(page, `Invoice ${model.number}`, 48, 12, sans, MUTED);
  page.drawText(model.status, { x: 470, y: y + 18, size: 11, font: sansBold, color: COPPER });

  y -= 28;
  page.drawLine({ start: { x: 48, y }, end: { x: 564, y }, thickness: 1, color: LINE });
  y -= 28;

  draw(page, "Bill to", 48, 9, sansBold, MUTED);
  draw(page, "Issued", 360, 9, sansBold, MUTED);
  y -= 16;
  draw(page, model.clientName, 48, 12, sansBold);
  draw(page, model.issueDate, 360, 12, sans);
  y -= 16;
  if (model.clientEmail) {
    draw(page, model.clientEmail, 48, 10, sans, MUTED);
  }
  draw(page, "Due", 360, 9, sansBold, MUTED);
  y -= 14;
  draw(page, model.dueDate, 360, 12, sans);
  y -= 28;

  page.drawRectangle({ x: 48, y: y - 6, width: 516, height: 22, color: rgb(0.96, 0.94, 0.9) });
  const headerY = y;
  page.drawText("Description", { x: 56, y: headerY, size: 9, font: sansBold, color: MUTED });
  page.drawText("Qty", { x: 340, y: headerY, size: 9, font: sansBold, color: MUTED });
  page.drawText("Rate", { x: 400, y: headerY, size: 9, font: sansBold, color: MUTED });
  page.drawText("Amount", { x: 490, y: headerY, size: 9, font: sansBold, color: MUTED });
  y -= 26;

  for (const item of model.items) {
    const lines = wrap(item.description, sans, 10, 260);
    ensure(lines.length * 14 + 10);
    lines.forEach((text, index) => {
      page.drawText(text, { x: 56, y, size: 10, font: sans, color: INK });
      if (index === 0) {
        page.drawText(item.quantity, { x: 340, y, size: 10, font: sans, color: INK });
        page.drawText(item.unitPrice, { x: 400, y, size: 10, font: sans, color: INK });
        page.drawText(item.total, { x: 490, y, size: 10, font: sans, color: INK });
      }
      y -= 14;
    });
    y -= 6;
  }

  ensure(90);
  y -= 8;
  page.drawLine({ start: { x: 340, y }, end: { x: 564, y }, thickness: 1, color: LINE });
  y -= 18;
  page.drawText("Subtotal", { x: 360, y, size: 10, font: sans, color: MUTED });
  page.drawText(model.subtotal, { x: 470, y, size: 10, font: sans, color: INK });
  y -= 16;
  page.drawText(model.taxLabel, { x: 360, y, size: 10, font: sans, color: MUTED });
  page.drawText(model.tax, { x: 470, y, size: 10, font: sans, color: INK });
  y -= 20;
  page.drawText("Total", { x: 360, y, size: 12, font: sansBold, color: INK });
  page.drawText(model.total, { x: 470, y, size: 12, font: sansBold, color: INK });

  if (model.notes) {
    y -= 36;
    ensure(40);
    page.drawText("Notes", { x: 48, y, size: 9, font: sansBold, color: MUTED });
    y -= 16;
    for (const text of wrap(model.notes, sans, 10, 500)) {
      ensure(16);
      page.drawText(text, { x: 48, y, size: 10, font: sans, color: INK });
      y -= 14;
    }
  }

  const pages = doc.getPages();
  pages.forEach((entry, index) => {
    entry.drawText(`${model.studio} · ${model.number} · ${index + 1}/${pages.length}`, {
      x: 48,
      y: 32,
      size: 8,
      font: sans,
      color: MUTED,
    });
  });

  return doc.save();
}

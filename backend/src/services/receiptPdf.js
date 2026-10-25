import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';

const formatMoney = (amount, currency) => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    currencyDisplay: 'code',
  });
  const digits = formatter.resolvedOptions().maximumFractionDigits;
  return formatter.format(amount / 10 ** digits);
};

const drawHeader = (doc, invoice) => {
  const logoPath = path.resolve(process.env.RECEIPT_LOGO_PATH || 'assets/logo.png');

  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 50, 40, { fit: [140, 50] });
  } else {
    doc.font('Helvetica-Bold').fontSize(18).fillColor('#111111').text('NEXUS CORPORATE', 50, 50);
  }

  doc.font('Helvetica-Bold').fontSize(22).fillColor('#111111').text('RECEIPT', 350, 50, { width: 195, align: 'right' });

  doc.font('Helvetica').fontSize(10).fillColor('#444444');
  doc.text(`Invoice: ${invoice.invoiceNumber}`, 350, 80, { width: 195, align: 'right' });
  doc.text(`Paid on: ${invoice.paidAt.toISOString().slice(0, 10)}`, 350, 95, { width: 195, align: 'right' });

  doc.moveTo(50, 125).lineTo(545, 125).strokeColor('#dddddd').lineWidth(1).stroke();

  doc.font('Helvetica-Bold').fontSize(10).fillColor('#111111').text('BILLED TO', 50, 145);
  doc.font('Helvetica').fillColor('#444444');
  doc.text(invoice.clientName, 50, 160);
  doc.text(invoice.clientEmail, 50, 175);
};

const drawItems = (doc, invoice) => {
  let y = 230;

  doc.font('Helvetica-Bold').fontSize(10).fillColor('#111111');
  doc.text('Description', 50, y, { width: 240 });
  doc.text('Qty', 300, y, { width: 40, align: 'right' });
  doc.text('Unit price', 345, y, { width: 100, align: 'right' });
  doc.text('Amount', 450, y, { width: 95, align: 'right' });

  y += 18;
  doc.moveTo(50, y).lineTo(545, y).strokeColor('#dddddd').stroke();

  doc.font('Helvetica').fillColor('#444444');

  for (const item of invoice.items) {
    y += 12;

    if (y > 600) {
      doc.addPage();
      y = 50;
    }

    doc.text(item.description, 50, y, { width: 240 });
    doc.text(String(item.quantity), 300, y, { width: 40, align: 'right' });
    doc.text(formatMoney(item.unitAmount, invoice.currency), 345, y, { width: 100, align: 'right' });
    doc.text(formatMoney(item.unitAmount * item.quantity, invoice.currency), 450, y, { width: 95, align: 'right' });

    y += doc.heightOfString(item.description, { width: 240 });
  }

  y += 16;
  doc.moveTo(50, y).lineTo(545, y).strokeColor('#dddddd').stroke();

  y += 12;
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#111111');
  doc.text('Total paid', 300, y, { width: 145, align: 'right' });
  doc.text(formatMoney(invoice.amount, invoice.currency), 450, y, { width: 95, align: 'right' });

  return y;
};

const drawPaidStamp = (doc, y) => {
  const color = '#1a9b4b';

  doc.save();
  doc.rotate(-15, { origin: [400, y + 70] });
  doc.opacity(0.8).lineWidth(4).strokeColor(color).fillColor(color);
  doc.roundedRect(330, y + 40, 140, 60, 6).stroke();
  doc.font('Helvetica-Bold').fontSize(36).text('PAID', 330, y + 53, { width: 140, align: 'center' });
  doc.restore();
};

export const generateReceipt = async (invoice) => {
  const directory = path.resolve('receipts');
  await fs.promises.mkdir(directory, { recursive: true });

  const filePath = path.join(directory, `${invoice.invoiceNumber.replace(/[^\w-]/g, '_')}.pdf`);
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const stream = fs.createWriteStream(filePath);

  const finished = new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  doc.pipe(stream);

  drawHeader(doc, invoice);
  const totalY = drawItems(doc, invoice);
  drawPaidStamp(doc, totalY);

  doc.end();
  await finished;

  return filePath;
};

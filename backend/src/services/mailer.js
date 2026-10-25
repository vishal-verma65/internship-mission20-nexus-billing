import nodemailer from 'nodemailer';

const port = Number(process.env.SMTP_PORT);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port,
  secure: port === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendReceiptEmail = (invoice, filePath) =>
  transporter.sendMail({
    from: process.env.MAIL_FROM,
    to: invoice.clientEmail,
    subject: `Payment receipt for invoice ${invoice.invoiceNumber}`,
    text: `Hi ${invoice.clientName},\n\nThank you for your payment. Your receipt for invoice ${invoice.invoiceNumber} is attached.\n\nNexus Corporate`,
    attachments: [
      {
        filename: `${invoice.invoiceNumber}-receipt.pdf`,
        path: filePath,
      },
    ],
  });

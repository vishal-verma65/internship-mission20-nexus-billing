import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { verifyInvoiceOwnership } from '../middleware/invoiceOwnership.js';
import { Invoice } from '../models/Invoice.js';
import { stripe } from '../config/stripe.js';
import { generateReceipt } from '../services/receiptPdf.js';
import { sendReceiptEmail } from '../services/mailer.js';

const router = Router();

const hiddenFields = ['receiptPath', 'stripeSessionId', 'stripePaymentIntentId'];

const toPublic = (invoice) => {
  const data = invoice.toObject();
  hiddenFields.forEach((field) => delete data[field]);
  return data;
};

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const invoices = await Invoice.find({ client: req.user.id }).sort({ createdAt: -1 });
    res.json(invoices.map(toPublic));
  } catch (error) {
    next(error);
  }
});

router.get('/:id', verifyInvoiceOwnership, (req, res) => {
  res.json(toPublic(req.invoice));
});

router.get('/:id/receipt', verifyInvoiceOwnership, (req, res, next) => {
  const { invoice } = req;

  if (invoice.status !== 'Paid' || !invoice.receiptPath) {
    return res.status(404).json({ message: 'Receipt not available' });
  }

  res.download(invoice.receiptPath, `${invoice.invoiceNumber}-receipt.pdf`, (error) => {
    if (error && !res.headersSent) next(error);
  });
});

router.post('/:id/receipt/resend', verifyInvoiceOwnership, async (req, res, next) => {
  const { invoice } = req;

  if (invoice.status !== 'Paid') {
    return res.status(409).json({ message: 'Invoice is not paid' });
  }

  try {
    if (!invoice.receiptPath) {
      invoice.receiptPath = await generateReceipt(invoice);
      await invoice.save();
    }

    await sendReceiptEmail(invoice, invoice.receiptPath);
    res.json({ message: 'Receipt sent' });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/checkout', verifyInvoiceOwnership, async (req, res, next) => {
  const { invoice } = req;

  if (invoice.status === 'Paid') {
    return res.status(409).json({ message: 'Invoice already paid' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: invoice.clientEmail,
      client_reference_id: invoice.id,
      metadata: { invoiceId: invoice.id },
      payment_intent_data: { metadata: { invoiceId: invoice.id } },
      line_items: invoice.items.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: invoice.currency,
          unit_amount: item.unitAmount,
          product_data: { name: item.description },
        },
      })),
      success_url: `${process.env.CLIENT_URL}/invoices/${invoice.id}?payment=success`,
      cancel_url: `${process.env.CLIENT_URL}/invoices/${invoice.id}?payment=cancelled`,
    });

    invoice.stripeSessionId = session.id;
    await invoice.save();

    res.json({ url: session.url });
  } catch (error) {
    next(error);
  }
});

export default router;

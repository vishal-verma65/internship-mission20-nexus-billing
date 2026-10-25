import express, { Router } from 'express';
import { stripe } from '../config/stripe.js';
import { Invoice } from '../models/Invoice.js';
import { generateReceipt } from '../services/receiptPdf.js';
import { sendReceiptEmail } from '../services/mailer.js';

const router = Router();

const markInvoicePaid = (session) => {
  if (session.payment_status !== 'paid') return null;

  return Invoice.findOneAndUpdate(
    {
      _id: session.metadata.invoiceId,
      stripeSessionId: session.id,
      amount: session.amount_total,
      status: { $ne: 'Paid' },
    },
    {
      status: 'Paid',
      paidAt: new Date(),
      stripePaymentIntentId: session.payment_intent,
    },
    { new: true }
  );
};

const markInvoiceFailed = (session) =>
  Invoice.findOneAndUpdate(
    { _id: session.metadata.invoiceId, stripeSessionId: session.id, status: 'Pending' },
    { status: 'Failed' },
    { new: true }
  );

const deliverReceipt = async (invoice) => {
  try {
    invoice.receiptPath = await generateReceipt(invoice);
    await invoice.save();
  } catch (error) {
    console.error(`Receipt generation failed for invoice ${invoice.invoiceNumber}`, error);
    return;
  }

  try {
    await sendReceiptEmail(invoice, invoice.receiptPath);
  } catch (error) {
    console.error(`Receipt email failed for invoice ${invoice.invoiceNumber}`, error);
  }
};

router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch {
    return res.status(400).json({ message: 'Invalid signature' });
  }

  let paidInvoice = null;

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        paidInvoice = await markInvoicePaid(event.data.object);
        break;
      case 'checkout.session.async_payment_failed':
        await markInvoiceFailed(event.data.object);
        break;
    }
  } catch {
    return res.status(500).json({ message: 'Webhook processing failed' });
  }

  res.json({ received: true });

  if (paidInvoice) {
    await deliverReceipt(paidInvoice);
  }
});

export default router;

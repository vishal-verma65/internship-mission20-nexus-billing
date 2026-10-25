import mongoose from 'mongoose';
import { Invoice } from '../models/Invoice.js';

export const verifyInvoiceOwnership = async (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: 'Invalid invoice id' });
  }

  try {
    const invoice = await Invoice.findById(id);

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (invoice.client.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    req.invoice = invoice;
    next();
  } catch (error) {
    next(error);
  }
};

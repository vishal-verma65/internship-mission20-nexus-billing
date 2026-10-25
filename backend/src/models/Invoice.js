import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    unitAmount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    clientName: { type: String, required: true, trim: true },
    clientEmail: { type: String, required: true, lowercase: true, trim: true },
    items: { type: [itemSchema], required: true },
    amount: { type: Number, required: true, min: 1 },
    currency: { type: String, required: true, lowercase: true, default: 'usd' },
    status: { type: String, enum: ['Pending', 'Paid', 'Failed'], default: 'Pending' },
    stripeSessionId: { type: String, index: true, sparse: true },
    stripePaymentIntentId: { type: String },
    receiptPath: { type: String },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

export const Invoice = mongoose.model('Invoice', invoiceSchema);

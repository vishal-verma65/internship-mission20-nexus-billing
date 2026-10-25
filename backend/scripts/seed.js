import 'dotenv/config';
import mongoose from 'mongoose';
import { Invoice } from '../src/models/Invoice.js';

const clients = [
  { id: '665f1a2b3c4d5e6f7a8b9c01', name: 'Client A', email: 'client-a@example.com' },
  { id: '665f1a2b3c4d5e6f7a8b9c02', name: 'Client B', email: 'client-b@example.com' },
];

await mongoose.connect(process.env.MONGODB_URI);
await Invoice.deleteMany({ invoiceNumber: /^SEED-/ });

const created = await Invoice.insertMany(
  clients.map((client, index) => {
    const items = [
      { description: 'Platform subscription', quantity: 1, unitAmount: 4900 * (index + 1) },
      { description: 'Onboarding support', quantity: 2, unitAmount: 1500 },
    ];

    return {
      invoiceNumber: `SEED-${index + 1}`,
      client: client.id,
      clientName: client.name,
      clientEmail: process.env.SEED_EMAIL || client.email,
      items,
      amount: items.reduce((sum, item) => sum + item.quantity * item.unitAmount, 0),
      currency: 'usd',
    };
  })
);

console.table(
  created.map((invoice, index) => ({
    client: clients[index].name,
    clientId: clients[index].id,
    invoiceId: invoice.id,
    amount: invoice.amount,
  }))
);

await mongoose.disconnect();

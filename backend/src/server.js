import 'dotenv/config';
import app from './app.js';
import { connectDB } from './config/db.js';
import { stripe } from './config/stripe.js';

const port = process.env.PORT || 3000;

const start = async () => {
  await connectDB();

  try {
    const account = await stripe.accounts.retrieve();
    console.log(`Stripe account: ${account.id}`);
  } catch (error) {
    console.error('Stripe key check failed', error.message);
  }

  app.listen(port, () => console.log(`Server listening on port ${port}`));
};

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
import 'dotenv/config';
import app from './app.js';
import { connectDB } from './config/db.js';

const port = process.env.PORT || 3000;

const start = async () => {
  await connectDB();
  app.listen(port, () => console.log(`Server listening on port ${port}`));
};

start().catch((error) => {
  console.error(error);
  process.exit(1);
});

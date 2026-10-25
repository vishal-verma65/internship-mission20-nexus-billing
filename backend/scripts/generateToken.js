import 'dotenv/config';
import jwt from 'jsonwebtoken';

const [userId, role = 'client'] = process.argv.slice(2);

if (!userId) {
  console.error('Usage: node scripts/generateToken.js <userId> [role]');
  process.exit(1);
}

const token = jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
  algorithm: 'HS256',
  expiresIn: '1h',
});

console.log(token);

# Nexus Billing

Zero-trust invoicing platform. The backend and frontend are separate projects with their own dependencies, env files, and READMEs.

```
.
├── backend/     Node.js, Express, MongoDB, Stripe, pdfkit, nodemailer
└── frontend/    React, Vite, React Router
```

## Quick start

Run each project in its own terminal.

**Backend** (see [backend/README.md](backend/README.md))

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

**Frontend** (see [frontend/README.md](frontend/README.md))

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

**Stripe webhook** (third terminal)

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Put the printed `whsec_...` value in `backend/.env` as `STRIPE_WEBHOOK_SECRET`, then restart the backend.

Open `http://localhost:5173`. In development the frontend proxies `/api` to `http://localhost:3000`.

## How the two connect

- The frontend calls the backend's `/api` routes with `Authorization: Bearer <token>`.
- The backend's `CLIENT_URL` must match the frontend's origin, because Stripe redirects the user there after payment.
- Tokens are not issued by this project. Generate test tokens with `node scripts/generateToken.js <userId>` in `backend/`.

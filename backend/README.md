# Nexus Billing: Backend

Zero-trust invoicing API built with Node.js, Express (ES Modules), MongoDB, and Stripe.

## Features

- JWT verification on every `/api/invoices` route
- IDOR protection: a client requesting another client's invoice receives `403 Forbidden`
- Stripe hosted Checkout, with payment confirmed only through a signature-verified webhook (`stripe.webhooks.constructEvent`)
- Idempotent webhook handling that checks the invoice, session, and amount before marking an invoice `Paid`
- PDF receipt with a logo and a "PAID" stamp, generated with pdfkit and emailed with nodemailer after payment
- Receipt download and resend, both restricted to the invoice owner
- Rate limiting, security headers (helmet), and a health check

## Structure

```
backend/
├── src/
│   ├── config/          db.js, stripe.js
│   ├── middleware/      authenticate.js, invoiceOwnership.js
│   ├── models/          Invoice.js
│   ├── routes/          invoices.js, webhooks.js
│   ├── services/        receiptPdf.js, mailer.js
│   ├── app.js
│   └── server.js
├── scripts/             seed.js, generateToken.js
├── assets/              place logo.png here (optional)
├── .env.example
└── package.json
```

## Prerequisites

- Node.js 18 or newer
- A MongoDB instance (local or Atlas)
- A Stripe account in test mode and the [Stripe CLI](https://stripe.com/docs/stripe-cli)
- An SMTP account (for example Gmail with an app password, Mailtrap, or SendGrid)

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Fill in `.env` before starting:

| Variable | Description |
| --- | --- |
| `PORT` | API port (default `3000`) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret used to verify HS256 tokens |
| `CLIENT_URL` | Frontend origin, used for Stripe redirect URLs (`http://localhost:5173`) |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret (`whsec_...`) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | SMTP credentials (port 465 uses TLS) |
| `MAIL_FROM` | Sender shown on receipt emails |
| `RECEIPT_LOGO_PATH` | Logo path for the PDF (default `assets/logo.png`) |
| `SEED_EMAIL` | Optional. Email for seeded invoices, so test receipts reach you |

If the logo file is missing, the receipt header shows the text "NEXUS CORPORATE".

## Stripe webhook (local)

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the printed `whsec_...` value into `STRIPE_WEBHOOK_SECRET` and restart the API.

## Authentication

This API verifies JWTs but does not issue them, since login is outside the scope of the requirements. Tokens must be signed with HS256 using `JWT_SECRET` and contain an `id` claim (the client's user ID, matching the invoice's `client` field). An optional `role` claim is read but not used for access decisions.

Generate a test token with:

```bash
node scripts/generateToken.js <userId>
```

## API

All `/api/invoices` routes require `Authorization: Bearer <token>`.

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | Service and database status |
| GET | `/api/invoices` | List the authenticated client's invoices |
| GET | `/api/invoices/:id` | Get one invoice (owner only) |
| POST | `/api/invoices/:id/checkout` | Create a Stripe Checkout session, returns `{ url }` |
| GET | `/api/invoices/:id/receipt` | Download the PDF receipt of a paid invoice |
| POST | `/api/invoices/:id/receipt/resend` | Email the receipt again |
| POST | `/api/webhooks/stripe` | Stripe webhook (signature verified, no JWT) |

Amounts are stored in the smallest currency unit (cents or paise).

## Testing

### IDOR protection

```bash
npm run seed
node scripts/generateToken.js 665f1a2b3c4d5e6f7a8b9c01
```

The seed command prints the client IDs and invoice IDs. With Client A's token:

- `GET /api/invoices/<Client A invoice id>` returns `200`
- `GET /api/invoices/<Client B invoice id>` returns `403`
- Any request without a token returns `401`

### Payment flow

1. Call `POST /api/invoices/:id/checkout` (or use the frontend) and open the returned URL.
2. Pay with test card `4242 4242 4242 4242` (any future expiry, any CVC).
3. Stripe calls the webhook, which marks the invoice `Paid`, creates `receipts/<invoiceNumber>.pdf`, and emails it to the invoice's `clientEmail`.

## Security notes

- The webhook is mounted before `express.json()` because signature verification needs the raw body.
- The checkout amount always comes from the stored invoice, never from the request.
- Receipts are only ever emailed to the invoice's stored `clientEmail`.
- Stripe IDs and the server file path are removed from invoice API responses.
- Rate limits: 300 requests per 15 minutes on `/api`, and 10 per 15 minutes on checkout and receipt resend. The webhook is not limited. Behind a reverse proxy, add `app.set('trust proxy', 1)` in `src/app.js`.

## Deployment notes

- This API has no CORS configuration. In development the frontend's Vite proxy avoids the need for it. If you deploy the frontend on a different origin than the API, add the `cors` package and allow `CLIENT_URL`.
- Receipts are saved to the local `receipts/` folder. Use object storage (such as S3) if you run more than one server instance.

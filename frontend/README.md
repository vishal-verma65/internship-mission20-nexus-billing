# Nexus Billing: Frontend

Responsive React interface for the Nexus Billing API, built with Vite and React Router.

## Features

- Sign-in screen that accepts a JWT (the API verifies it, and a `401` returns the user here)
- Invoice list with status badges
- Invoice detail with line items and total
- **Pay now** button that starts Stripe Checkout and redirects to the hosted page
- Payment result banner after the Stripe redirect, with automatic status re-checks until the webhook confirms payment
- Receipt download and "email receipt again" for paid invoices
- Clear message when the API returns `403` for an invoice the user does not own

## Structure

```
frontend/
├── src/
│   ├── pages/           Login.jsx, Invoices.jsx, InvoiceDetail.jsx
│   ├── api.js           fetch wrapper, token storage, receipt download
│   ├── AuthContext.jsx
│   ├── App.jsx
│   ├── format.js
│   ├── main.jsx
│   └── styles.css
├── index.html
├── vite.config.js
├── .env.example
└── package.json
```

## Setup

The backend must be running first (see the backend README).

```bash
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173`.

| Variable | Description |
| --- | --- |
| `VITE_API_URL` | API base path or URL. Keep `/api` in development, where Vite proxies it to `http://localhost:3000` |

To point the proxy at a different backend port, edit `server.proxy` in `vite.config.js`.

## Signing in

The project does not include a login flow. Generate a token in the backend folder and paste it into the sign-in screen:

```bash
node scripts/generateToken.js 665f1a2b3c4d5e6f7a8b9c01
```

The token is kept in `sessionStorage` and cleared when you sign out or the API returns `401`.

## Payment flow

1. Open an invoice and click **Pay now**.
2. Pay with Stripe test card `4242 4242 4242 4242`.
3. Stripe sends you back to `/invoices/:id?payment=success`. The page re-checks every 2 seconds, for up to 20 seconds, until the webhook marks the invoice `Paid`.
4. If you click **Download receipt** immediately after the invoice turns `Paid`, you may briefly see "Receipt not available" while the PDF is generated. Try again after a moment.

## Production build

```bash
npm run build
```

This creates `dist/`. In production there is no Vite proxy, so either serve the built app and the API from the same domain, or set `VITE_API_URL` to the API's full URL before building and enable CORS on the backend.

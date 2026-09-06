# ProjectVault — Premium Student Project Marketplace

A React + Vite marketplace UI for selling academic/college projects to students.

## What changed in the premium redesign

- 40 seeded listings across 8 project domains:
  - Machine Learning
  - AI & Data Science
  - Android
  - Web Development
  - Web App
  - Python
  - IoT
  - Java
- Premium storefront with:
  - polished hero/dashboard visual
  - category discovery cards
  - popular-domain ticker
  - search + category + difficulty + price/newness filters
  - featured project badges
  - richer project cards with technology, difficulty, tags and catalog stats
  - detailed project pages
  - related project recommendations
  - package/deliverables section
  - negotiation modal
  - student-focused trust signals and workflow sections
- Super Admin workspace with:
  - overview/control center
  - catalog pulse and marketplace health metrics
  - project CRUD
  - publish/draft toggle
  - featured listing toggle
  - project search
  - negotiation inbox
  - negotiation status workflow
  - demo login
- Local persistence using `localStorage` for projects and negotiation requests.

## Run

```bash
npm install
npm run dev
```

## Deploy and configure

The app is deployable on Vercel (the `api/` folder contains serverless Cashfree endpoints). Copy `.env.example` to `.env` locally or add the same variables in your hosting provider. Put the two values from `APIKey.csv` in `CASHFREE_CLIENT_ID` and `CASHFREE_CLIENT_SECRET`; never put them in a `VITE_` variable or commit them. Use `CASHFREE_MODE=sandbox` for the supplied test keys and switch to production credentials only after Cashfree account approval. Set `VITE_WHATSAPP_NUMBER` to the business WhatsApp number in international format without `+`.

Cashfree return URLs only indicate that the customer returned from checkout. Fulfilment must be gated on a verified `PAID` order from `api/verify-order.js` or a Cashfree webhook, not on the browser redirect alone. The admin/catalog and negotiation inbox are still localStorage demo data and should be moved to a database before accepting real orders at scale.

### Beginner setup

1. Install Node.js, then run `npm install` and `npm run dev` to view the storefront.
2. Create a `.env` file from `.env.example`. Copy the two test values from `APIKey.csv` into `CASHFREE_CLIENT_ID` and `CASHFREE_CLIENT_SECRET`. Do not paste them into `src/main.jsx`.
3. Because `npm run dev` serves only the Vite frontend, use a Vercel preview deployment to test the complete Cashfree flow. Vercel gives you a temporary `*.vercel.app` URL; no purchased domain is required. Add that URL to `APP_URL` and set `CASHFREE_WEBHOOK_URL` to its `/api/cashfree-webhook` endpoint.
4. Keep `CASHFREE_MODE=sandbox` and `VITE_CASHFREE_MODE=sandbox` while testing. Use Cashfree’s sandbox test payment details.
5. The flow is: Buy this project → customer form → `/api/create-order` → Cashfree hosted checkout → `/payment-success` → `/api/verify-order`. Cashfree can also call `/api/cashfree-webhook` for status events.
6. Before accepting real orders, replace the localStorage catalog with a database and make `api/create-order.js` read the project price from that database. Never trust a price sent by the browser.

### Secure referrals and accounts

The referral hub uses Supabase Auth and server-side attribution. In the Supabase dashboard SQL Editor, run [`supabase/schema.sql`](supabase/schema.sql) once, then run [`supabase/migrations/001_orders_and_rewards.sql`](supabase/migrations/001_orders_and_rewards.sql). Enable email/password sign-up in Authentication → Providers → Email. The public anon key belongs in `VITE_SUPABASE_ANON_KEY`; the service-role key belongs only in `SUPABASE_SERVICE_ROLE_KEY`. The app creates a unique personal link after sign-in, attributes a referred account only once, rejects self-referrals, and creates pending rewards only after verified payment/webhook processing.

## Demo admin

Route: `/admin`

Password: `admin123`

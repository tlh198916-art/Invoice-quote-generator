# InvoiceFlow — Invoice & Quote Generator

A simple, mobile-friendly invoice and quote generator that runs entirely in the browser for document data.

## Features

- Invoice and quote modes
- Live preview
- Unlimited line items
- Tax and discount calculations
- Multiple currencies
- Custom accent color
- PDF download
- Print
- Save, open, and delete documents locally
- Quote-to-invoice workflow by switching document type/editing details
- Responsive mobile layout
- No database or API keys required

## Run locally

```bash
npm install
npm run dev
```

Open the local Vite URL shown in the terminal.

## Production

```bash
npm install
npm run build
npm start
```

The Express server serves the production `dist` folder.

## Deploy on Render

Create a new **Web Service** connected to this repository.

- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Environment: Node
- Environment variables: none required

A `render.yaml` is included for Blueprint deployment.

## Data and privacy

The current version stores saved documents in the customer's browser using localStorage. No invoice/customer data is sent to this server.

## Future upgrades

Good next features include user accounts, cloud sync, Stripe subscriptions, email delivery, custom PDF templates, recurring invoices, online payment links, and a customer database.

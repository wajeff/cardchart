# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Database (Neon Postgres)

CardChart stores promotion history and alert subscribers in Postgres, hosted on
[Neon](https://neon.com)'s free plan. The schema lives in `db/schema.sql`.

1. In Vercel, open the project → **Storage** → **Create Database** → **Neon**
   (free plan) and connect it to this project. Vercel adds `DATABASE_URL`.
2. Copy `DATABASE_URL` into a local `.env` (see `.env.example`).
3. Create the tables once: `npm run db:migrate` (safe to re-run).
4. Redeploy, or trigger `/api/cron-update` to collect the first data point.

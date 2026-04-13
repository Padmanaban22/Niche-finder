# NicheHunter

NicheHunter is a robust, full-stack Next.js web application for advanced YouTube faceless niche research. 

## Getting Started

First, run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Deploying on Vercel with Neon Postgres

This application uses PostgreSQL for its database, which makes it fully ready to be deployed on Vercel using Neon as the Serverless Postgres provider.

### 1. Setup Neon Database
- Create an account on [Neon](https://neon.tech/) and set up a new project.
- Get the Connection String (PostgreSQL URL) from the Neon dashboard. It should look something like: `postgresql://[role]:[password]@[endpoint].neon.tech/neondb?sslmode=require`

### 2. Configure Vercel
- Import your repository on Vercel.
- Before clicking **Deploy**, configure the following environment variables:
  - `DATABASE_URL`: Set this to your Neon Connection String.
- Vercel will automatically run the build scripts defined in `package.json`:
  - `postinstall`: Generates the Prisma Client.
  - `build`: Applies database schema changes (`prisma db push --accept-data-loss`) and creates the Next.js production build natively (no `output: standalone` required).

### 3. Deploy
- Click Deploy on the Vercel dashboard. The build process will map your schema on the new database and initialize your application seamlessly.

## Learn More

To learn more about Next.js, take a look at the following resources:
- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

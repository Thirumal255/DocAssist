/**
 * Creates (or resets the password of) the clinic's first admin account.
 * Reads ADMIN_EMAIL, ADMIN_NAME and ADMIN_PASSWORD from the environment;
 * on Cloud Run ADMIN_PASSWORD comes from Secret Manager, never from code.
 *
 *   Local:      ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run admin:create
 *   Cloud Run:  the `docassist-ops` job with args ["dist/scripts/create-admin.js"]
 */
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';

async function main() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const name = (process.env.ADMIN_NAME || 'Clinic Admin').trim();
  const password = process.env.ADMIN_PASSWORD || '';

  if (!email || !email.includes('@')) throw new Error('ADMIN_EMAIL is required');
  if (password.length < 12) throw new Error('ADMIN_PASSWORD must be at least 12 characters');

  const hash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: { password: hash, role: 'admin', isActive: true },
    create: { email, name, password: hash, role: 'admin' },
  });
  console.log(`Admin account ready: ${user.email}`);
}

main()
  .catch((err) => {
    console.error(err.message || err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

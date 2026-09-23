import type { ProfileId } from './model';

export type SecurityContact = { type: 'sms' | 'email'; label: string; verified: boolean };
export type SecurityAccount = { profileId: ProfileId; name: string; emailHash: string; contacts: SecurityContact[] };

const USER_ID_HEADER = 'oai-authenticated-user-id';
const USER_EMAIL_HEADER = 'oai-authenticated-user-email';
const metaEnv = (import.meta as ImportMeta & { env?: Record<string, string | boolean | undefined> }).env;
const isDev = metaEnv?.DEV === true || process.env.NODE_ENV === 'test';
const secureDev = metaEnv?.BUSCA_VAGAS_SECURE_DEV === '1' || process.env.BUSCA_VAGAS_SECURE_DEV === '1';

export const securityAccounts: SecurityAccount[] = [
  {
    profileId: 'gabriel',
    name: 'Gabriel',
    emailHash: '3718db2f26e979e1340b4ae92844ed8cfdd1520212bd12340764259189d65f3d',
    contacts: [
      { type: 'sms', label: '996****47', verified: true },
      { type: 'email', label: 'gabriel.henrique7087@g***.com', verified: true },
    ],
  },
  {
    profileId: 'milena',
    name: 'Milena',
    emailHash: '6a34aee8d936194ab046e7302a680eb3e1b6cf69c18533932fe8e9b2c4ece617',
    contacts: [
      { type: 'sms', label: '991****17', verified: true },
      { type: 'email', label: 'milysilva42@g***.com', verified: true },
    ],
  },
];

export async function authenticatedAccount(request: Request) {
  const userId = request.headers.get(USER_ID_HEADER);
  const email = request.headers.get(USER_EMAIL_HEADER);
  if (!userId) {
    if (isDev && !secureDev) return { owner: 'local-workspace', account: null };
    throw new Error('AUTH_REQUIRED');
  }
  if (!email) {
    if (isDev && !secureDev) return { owner: userId, account: null };
    throw new Error('AUTH_REQUIRED');
  }
  const emailHash = await sha256(email.trim().toLowerCase());
  const account = securityAccounts.find(item => item.emailHash === emailHash);
  if (!account) throw new Error('ACCESS_DENIED');
  return { owner: `account:${account.profileId}`, account };
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

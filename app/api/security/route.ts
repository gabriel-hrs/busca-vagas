import { authenticatedAccount, securityAccounts } from '@/lib/security';
import { failure } from '@/lib/server';

export async function GET(request: Request) {
  try {
    const { account } = await authenticatedAccount(request);
    return Response.json({
      account: account ? { profileId: account.profileId, name: account.name, contacts: account.contacts } : null,
      accounts: securityAccounts.map(item => ({ profileId: item.profileId, name: item.name, contacts: item.contacts })),
      enforcement: {
        access: 'Produção restrita às contas autorizadas.',
        secondFactor: 'E-mails autorizados cadastrados e mascarados. Códigos de acesso são enviados por e-mail.',
      },
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (e) { return failure(e); }
}

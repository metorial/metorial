import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let accountSchema = z.object({
  accountId: z.string().describe('Account ID'),
  accountName: z.string().optional().describe('Account/organization name'),
  emailAddress: z.string().optional().describe('Primary email address'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  displayName: z.string().optional().describe('Display name'),
  country: z.string().optional().describe('Country'),
  language: z.string().optional().describe('Language preference'),
  timeZone: z.string().optional().describe('Timezone'),
  mailboxStatus: z.string().optional().describe('Mailbox status (enabled/disabled)'),
  usedStorage: z.number().optional().describe('Used storage in bytes'),
  planStorage: z.number().optional().describe('Plan storage limit in bytes'),
  lastLogin: z.string().optional().describe('Last login timestamp'),
  imapAccessEnabled: z.boolean().optional().describe('IMAP access enabled'),
  popAccessEnabled: z.boolean().optional().describe('POP access enabled')
});

export let getAccountInfo = SlateTool.create(spec, {
  name: 'Get Account Info',
  key: 'get_account_info',
  description: `Retrieve Zoho Mail account details including email addresses, storage usage, and access settings. Returns all mail accounts associated with the authenticated user, or details for a specific account.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      accountId: z
        .string()
        .optional()
        .describe('Specific account ID to retrieve. If omitted, returns all accounts.')
    })
  )
  .output(
    z.object({
      accounts: z.array(accountSchema).describe('Account details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      domain: ctx.auth.dataCenterDomain
    });

    let mapAccount = (a: any) => ({
      accountId: String(a.accountId),
      accountName: a.accountName,
      emailAddress: a.emailAddress?.[0]?.mailId || a.primaryEmailAddress,
      firstName: a.firstName,
      lastName: a.lastName,
      displayName: a.accountDisplayName || a.displayName,
      country: a.country,
      language: a.language,
      timeZone: a.timeZone,
      mailboxStatus: a.mailboxStatus,
      usedStorage: a.usedStorage !== undefined ? Number(a.usedStorage) : undefined,
      planStorage: a.planStorage !== undefined ? Number(a.planStorage) : undefined,
      lastLogin: a.lastLogin ? String(a.lastLogin) : undefined,
      imapAccessEnabled: a.imapAccessEnabled,
      popAccessEnabled: a.popAccessEnabled
    });

    if (ctx.input.accountId) {
      let account = await client.getAccount(ctx.input.accountId);
      let mapped = mapAccount(account);
      return {
        output: { accounts: [mapped] },
        message: `Retrieved account details for **${mapped.emailAddress || mapped.accountId}**.`
      };
    }

    let accounts = await client.getAccounts();
    let mapped = accounts.map(mapAccount);
    return {
      output: { accounts: mapped },
      message: `Retrieved **${mapped.length}** account(s).`
    };
  })
  .build();

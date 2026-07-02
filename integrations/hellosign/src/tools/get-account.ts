import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: `Retrieve the current Dropbox Sign account details including email address, callback URL, quota information, and role.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      accountId: z.string().describe('Unique account identifier'),
      emailAddress: z.string().describe('Account email address'),
      callbackUrl: z.string().optional().describe('Configured webhook callback URL'),
      isPaidHs: z
        .boolean()
        .optional()
        .describe('Whether the account has a paid HelloSign plan'),
      isPaidHf: z
        .boolean()
        .optional()
        .describe('Whether the account has a paid HelloFax plan'),
      quotas: z
        .object({
          templatesLeft: z.number().optional().describe('Number of templates remaining'),
          apiSignatureRequestsLeft: z
            .number()
            .optional()
            .describe('API signature requests remaining'),
          documentsLeft: z.number().optional().describe('Documents remaining'),
          smsVerificationsLeft: z.number().optional().describe('SMS verifications remaining')
        })
        .optional()
        .describe('Account quotas'),
      locale: z.string().optional().describe('Account locale')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let account = await client.getAccount();

    let quotas = account.quotas
      ? {
          templatesLeft: account.quotas.templates_left,
          apiSignatureRequestsLeft: account.quotas.api_signature_requests_left,
          documentsLeft: account.quotas.documents_left,
          smsVerificationsLeft: account.quotas.sms_verifications_left
        }
      : undefined;

    return {
      output: {
        accountId: account.account_id,
        emailAddress: account.email_address,
        callbackUrl: account.callback_url || undefined,
        isPaidHs: account.is_paid_hs,
        isPaidHf: account.is_paid_hf,
        quotas,
        locale: account.locale
      },
      message: `Account **${account.email_address}** (${account.account_id}).`
    };
  })
  .build();

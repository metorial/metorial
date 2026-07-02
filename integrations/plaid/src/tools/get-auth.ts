import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlaidClient } from '../lib/client';
import { spec } from '../spec';

let achNumberSchema = z.object({
  accountId: z.string().describe('Associated account ID'),
  account: z.string().describe('Account number'),
  routing: z.string().describe('Routing number'),
  wireRouting: z.string().nullable().optional().describe('Wire transfer routing number')
});

let eftNumberSchema = z.object({
  accountId: z.string().describe('Associated account ID'),
  account: z.string().describe('Account number'),
  institution: z.string().describe('Institution number'),
  branch: z.string().describe('Branch number')
});

let bacsNumberSchema = z.object({
  accountId: z.string().describe('Associated account ID'),
  account: z.string().describe('Account number'),
  sortCode: z.string().describe('Sort code')
});

let internationalNumberSchema = z.object({
  accountId: z.string().describe('Associated account ID'),
  iban: z.string().describe('IBAN'),
  bic: z.string().describe('BIC/SWIFT code')
});

export let getAuthTool = SlateTool.create(spec, {
  name: 'Get Auth',
  key: 'get_auth',
  description: `Retrieve bank account and routing numbers for ACH, wire, and other transfers. Returns ACH routing/account numbers (US), EFT institution/branch numbers (Canada), BACS sort codes (UK), and international IBAN/BIC codes depending on the institution's country.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      accessToken: z.string().describe('Access token for the Plaid Item'),
      accountIds: z
        .array(z.string())
        .optional()
        .describe('Specific account IDs to retrieve auth data for')
    })
  )
  .output(
    z.object({
      ach: z.array(achNumberSchema).describe('US ACH account and routing numbers'),
      eft: z.array(eftNumberSchema).describe('Canadian EFT numbers'),
      bacs: z.array(bacsNumberSchema).describe('UK BACS numbers'),
      international: z
        .array(internationalNumberSchema)
        .describe('International IBAN/BIC numbers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlaidClient({
      clientId: ctx.auth.clientId,
      secret: ctx.auth.secret,
      environment: ctx.config.environment
    });

    let result = await client.getAuth(ctx.input.accessToken, ctx.input.accountIds);
    let numbers = result.numbers || {};

    return {
      output: {
        ach: (numbers.ach || []).map((n: any) => ({
          accountId: n.account_id,
          account: n.account,
          routing: n.routing,
          wireRouting: n.wire_routing ?? null
        })),
        eft: (numbers.eft || []).map((n: any) => ({
          accountId: n.account_id,
          account: n.account,
          institution: n.institution,
          branch: n.branch
        })),
        bacs: (numbers.bacs || []).map((n: any) => ({
          accountId: n.account_id,
          account: n.account,
          sortCode: n.sort_code
        })),
        international: (numbers.international || []).map((n: any) => ({
          accountId: n.account_id,
          iban: n.iban,
          bic: n.bic
        }))
      },
      message: `Retrieved auth numbers: **${(numbers.ach || []).length}** ACH, **${(numbers.eft || []).length}** EFT, **${(numbers.bacs || []).length}** BACS, **${(numbers.international || []).length}** international.`
    };
  })
  .build();

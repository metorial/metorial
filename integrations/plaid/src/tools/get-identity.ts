import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlaidClient } from '../lib/client';
import { spec } from '../spec';

let ownerSchema = z.object({
  names: z.array(z.string()).describe('Account holder names'),
  emails: z
    .array(
      z.object({
        address: z.string(),
        primary: z.boolean(),
        type: z.string().optional()
      })
    )
    .describe('Account holder emails'),
  phoneNumbers: z
    .array(
      z.object({
        number: z.string(),
        primary: z.boolean(),
        type: z.string().optional()
      })
    )
    .describe('Account holder phone numbers'),
  addresses: z
    .array(
      z.object({
        street: z.string().nullable().optional(),
        city: z.string().nullable().optional(),
        region: z.string().nullable().optional(),
        postalCode: z.string().nullable().optional(),
        country: z.string().nullable().optional(),
        primary: z.boolean()
      })
    )
    .describe('Account holder addresses')
});

let identityAccountSchema = z.object({
  accountId: z.string().describe('Account identifier'),
  name: z.string().describe('Account name'),
  type: z.string().describe('Account type'),
  subtype: z.string().nullable().optional(),
  owners: z.array(ownerSchema).describe('Account owner identity details')
});

export let getIdentityTool = SlateTool.create(spec, {
  name: 'Get Identity',
  key: 'get_identity',
  description: `Retrieve account holder identity information as reported by the financial institution. Returns names, emails, phone numbers, and addresses for each account owner. Useful for KYC verification and fraud prevention.`,
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
        .describe('Specific account IDs to retrieve identity for')
    })
  )
  .output(
    z.object({
      accounts: z.array(identityAccountSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlaidClient({
      clientId: ctx.auth.clientId,
      secret: ctx.auth.secret,
      environment: ctx.config.environment
    });

    let result = await client.getIdentity(ctx.input.accessToken, ctx.input.accountIds);

    let accounts = (result.accounts || []).map((a: any) => ({
      accountId: a.account_id,
      name: a.name,
      type: a.type,
      subtype: a.subtype,
      owners: (a.owners || []).map((o: any) => ({
        names: o.names || [],
        emails: (o.emails || []).map((e: any) => ({
          address: e.data,
          primary: e.primary,
          type: e.type
        })),
        phoneNumbers: (o.phone_numbers || []).map((p: any) => ({
          number: p.data,
          primary: p.primary,
          type: p.type
        })),
        addresses: (o.addresses || []).map((addr: any) => ({
          street: addr.data?.street ?? null,
          city: addr.data?.city ?? null,
          region: addr.data?.region ?? null,
          postalCode: addr.data?.postal_code ?? null,
          country: addr.data?.country ?? null,
          primary: addr.primary
        }))
      }))
    }));

    return {
      output: { accounts },
      message: `Retrieved identity information for **${accounts.length}** account(s).`
    };
  })
  .build();

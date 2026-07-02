import { SlateTool } from 'slates';
import { z } from 'zod';
import { NutshellClient } from '../lib/client';
import { spec } from '../spec';

export let updateAccount = SlateTool.create(spec, {
  name: 'Update Account',
  key: 'update_account',
  description: `Update an existing account (company) in Nutshell CRM. Provide the account ID and the fields to update. The current revision is fetched automatically for concurrency control.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      accountId: z.number().describe('ID of the account to update'),
      rev: z
        .string()
        .optional()
        .describe(
          'Revision identifier. If not provided, fetched automatically. Use "REV_IGNORE" to bypass.'
        ),
      name: z.string().optional().describe('Updated company name'),
      urls: z.array(z.string()).optional().describe('Updated website URLs'),
      phones: z.array(z.string()).optional().describe('Updated phone numbers'),
      address: z
        .object({
          address1: z.string().optional(),
          address2: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          postalCode: z.string().optional(),
          country: z.string().optional()
        })
        .optional()
        .describe('Updated mailing address'),
      industryId: z.number().optional().describe('Updated industry ID'),
      description: z.string().optional().describe('Updated description'),
      ownerUserId: z.number().optional().describe('Updated owner user ID'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom field values to set. Set a value to null to remove it.')
    })
  )
  .output(
    z.object({
      accountId: z.number().describe('ID of the updated account'),
      rev: z.string().describe('New revision identifier'),
      name: z.string().describe('Name of the updated account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NutshellClient({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let rev = ctx.input.rev;
    if (!rev) {
      let existing = await client.getAccount(ctx.input.accountId);
      rev = String(existing.rev);
    }

    let accountData: Record<string, any> = {};
    if (ctx.input.name !== undefined) accountData.name = ctx.input.name;
    if (ctx.input.urls !== undefined) accountData.url = ctx.input.urls;
    if (ctx.input.phones !== undefined) accountData.phone = ctx.input.phones;
    if (ctx.input.address !== undefined) accountData.address = ctx.input.address;
    if (ctx.input.industryId !== undefined) accountData.industryId = ctx.input.industryId;
    if (ctx.input.description !== undefined) accountData.description = ctx.input.description;
    if (ctx.input.ownerUserId !== undefined)
      accountData.owner = { entityType: 'Users', id: ctx.input.ownerUserId };
    if (ctx.input.customFields !== undefined)
      accountData.customFields = ctx.input.customFields;

    let result = await client.editAccount(ctx.input.accountId, rev, accountData);

    return {
      output: {
        accountId: result.id,
        rev: String(result.rev),
        name: result.name
      },
      message: `Updated account **${result.name}** (ID: ${result.id}).`
    };
  })
  .build();

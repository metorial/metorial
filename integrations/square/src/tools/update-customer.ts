import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let updateCustomer = SlateTool.create(spec, {
  name: 'Update Customer',
  key: 'update_customer',
  description: `Update an existing customer profile. Only provided fields will be updated; omitted fields remain unchanged.`
})
  .input(
    z.object({
      customerId: z.string().describe('The ID of the customer to update'),
      givenName: z.string().optional().describe('Updated first name'),
      familyName: z.string().optional().describe('Updated last name'),
      companyName: z.string().optional().describe('Updated company name'),
      nickname: z.string().optional().describe('Updated nickname'),
      emailAddress: z.string().optional().describe('Updated email address'),
      phoneNumber: z.string().optional().describe('Updated phone number'),
      note: z.string().optional().describe('Updated note'),
      referenceId: z.string().optional().describe('Updated reference ID'),
      birthday: z.string().optional().describe('Updated birthday in YYYY-MM-DD format'),
      version: z.number().optional().describe('Current version for optimistic concurrency')
    })
  )
  .output(
    z.object({
      customerId: z.string().optional(),
      givenName: z.string().optional(),
      familyName: z.string().optional(),
      emailAddress: z.string().optional(),
      updatedAt: z.string().optional(),
      version: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let c = await client.updateCustomer(ctx.input.customerId, {
      givenName: ctx.input.givenName,
      familyName: ctx.input.familyName,
      companyName: ctx.input.companyName,
      nickname: ctx.input.nickname,
      emailAddress: ctx.input.emailAddress,
      phoneNumber: ctx.input.phoneNumber,
      note: ctx.input.note,
      referenceId: ctx.input.referenceId,
      birthday: ctx.input.birthday,
      version: ctx.input.version
    });

    return {
      output: {
        customerId: c.id,
        givenName: c.given_name,
        familyName: c.family_name,
        emailAddress: c.email_address,
        updatedAt: c.updated_at,
        version: c.version
      },
      message: `Customer **${c.id}** updated — ${[c.given_name, c.family_name].filter(Boolean).join(' ') || c.email_address || 'Customer'}`
    };
  })
  .build();

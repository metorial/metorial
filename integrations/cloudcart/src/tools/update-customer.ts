import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateCustomer = SlateTool.create(spec, {
  name: 'Update Customer',
  key: 'update_customer',
  description: `Update an existing customer's details such as name, email, newsletter preferences, or ban status. Only the provided fields will be updated.`
})
  .input(
    z.object({
      customerId: z.string().describe('ID of the customer to update'),
      email: z.string().optional().describe('Updated email address'),
      firstName: z.string().optional().describe('Updated first name'),
      lastName: z.string().optional().describe('Updated last name'),
      newsletter: z.boolean().optional().describe('Subscribe/unsubscribe from newsletter'),
      marketing: z.boolean().optional().describe('Opt-in/out of marketing'),
      active: z.boolean().optional().describe('Activate or deactivate customer'),
      banned: z.boolean().optional().describe('Ban or unban customer'),
      bannedReason: z.string().optional().describe('Reason for banning the customer'),
      note: z.string().optional().describe('Internal note about this customer')
    })
  )
  .output(
    z.object({
      customerId: z.string(),
      email: z.string().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.config.domain });

    let attributes: Record<string, any> = {};
    if (ctx.input.email !== undefined) attributes.email = ctx.input.email;
    if (ctx.input.firstName !== undefined) attributes.first_name = ctx.input.firstName;
    if (ctx.input.lastName !== undefined) attributes.last_name = ctx.input.lastName;
    if (ctx.input.newsletter !== undefined) attributes.newsletter = ctx.input.newsletter;
    if (ctx.input.marketing !== undefined) attributes.marketing = ctx.input.marketing;
    if (ctx.input.active !== undefined) attributes.active = ctx.input.active;
    if (ctx.input.banned !== undefined) attributes.banned = ctx.input.banned;
    if (ctx.input.bannedReason !== undefined)
      attributes.banned_reason = ctx.input.bannedReason;
    if (ctx.input.note !== undefined) attributes.note = ctx.input.note;

    let res = await client.updateCustomer(ctx.input.customerId, attributes);
    let c = res.data;

    return {
      output: {
        customerId: c.id,
        email: c.attributes.email,
        firstName: c.attributes.first_name,
        lastName: c.attributes.last_name,
        updatedAt: c.attributes.updated_at
      },
      message: `Updated customer **${c.attributes.email || c.id}**.`
    };
  })
  .build();

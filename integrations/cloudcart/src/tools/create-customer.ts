import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createCustomer = SlateTool.create(spec, {
  name: 'Create Customer',
  key: 'create_customer',
  description: `Create a new customer in the CloudCart store. Only an email address is required; optionally set name, group, newsletter, and marketing preferences.`
})
  .input(
    z.object({
      email: z.string().describe('Customer email address (required)'),
      firstName: z.string().optional().describe('Customer first name'),
      lastName: z.string().optional().describe('Customer last name'),
      groupId: z.string().optional().describe('Customer group ID to assign'),
      newsletter: z.boolean().optional().describe('Subscribe to newsletter'),
      marketing: z.boolean().optional().describe('Opt-in to marketing communications'),
      active: z.boolean().optional().describe('Whether the account is active'),
      note: z.string().optional().describe('Internal note about this customer')
    })
  )
  .output(
    z.object({
      customerId: z.string(),
      email: z.string().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      dateAdded: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.config.domain });

    let attributes: Record<string, any> = { email: ctx.input.email };
    if (ctx.input.firstName !== undefined) attributes.first_name = ctx.input.firstName;
    if (ctx.input.lastName !== undefined) attributes.last_name = ctx.input.lastName;
    if (ctx.input.newsletter !== undefined) attributes.newsletter = ctx.input.newsletter;
    if (ctx.input.marketing !== undefined) attributes.marketing = ctx.input.marketing;
    if (ctx.input.active !== undefined) attributes.active = ctx.input.active;
    if (ctx.input.note !== undefined) attributes.note = ctx.input.note;

    let relationships: Record<string, any> | undefined;
    if (ctx.input.groupId) {
      relationships = {
        group: {
          data: { type: 'customer-groups', id: ctx.input.groupId }
        }
      };
    }

    let res = await client.createCustomer(attributes, relationships);
    let c = res.data;

    return {
      output: {
        customerId: c.id,
        email: c.attributes.email,
        firstName: c.attributes.first_name,
        lastName: c.attributes.last_name,
        dateAdded: c.attributes.date_added
      },
      message: `Created customer **${c.attributes.email}** (ID: ${c.id}).`
    };
  })
  .build();

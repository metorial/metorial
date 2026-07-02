import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCustomer = SlateTool.create(spec, {
  name: 'Get Customer',
  key: 'get_customer',
  description: `Retrieve full details of a specific customer by their ID, including contact info, account status, and group membership.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      customerId: z.string().describe('The ID of the customer to retrieve'),
      includeGroup: z
        .boolean()
        .optional()
        .describe('Whether to include customer group details')
    })
  )
  .output(
    z.object({
      customerId: z.string(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().optional(),
      groupId: z.string().optional(),
      active: z.any().optional(),
      isActivated: z.any().optional(),
      emailConfirmed: z.any().optional(),
      banned: z.any().optional(),
      bannedReason: z.string().optional(),
      newsletter: z.any().optional(),
      marketing: z.any().optional(),
      note: z.string().optional(),
      dateAdded: z.string().optional(),
      updatedAt: z.string().optional(),
      relationships: z.record(z.string(), z.any()).optional(),
      included: z.array(z.any()).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.config.domain });

    let include = ctx.input.includeGroup ? 'group' : undefined;
    let res = await client.getCustomer(ctx.input.customerId, include);
    let c = res.data;

    return {
      output: {
        customerId: c.id,
        firstName: c.attributes.first_name,
        lastName: c.attributes.last_name,
        email: c.attributes.email,
        groupId: c.attributes.group_id,
        active: c.attributes.active,
        isActivated: c.attributes.is_activated,
        emailConfirmed: c.attributes.email_confirmed,
        banned: c.attributes.banned,
        bannedReason: c.attributes.banned_reason,
        newsletter: c.attributes.newsletter,
        marketing: c.attributes.marketing,
        note: c.attributes.note,
        dateAdded: c.attributes.date_added,
        updatedAt: c.attributes.updated_at,
        relationships: c.relationships,
        included: res.included
      },
      message: `Retrieved customer **${c.attributes.first_name || ''} ${c.attributes.last_name || ''}** (${c.attributes.email}).`
    };
  })
  .build();

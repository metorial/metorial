import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageCustomerGroups = SlateTool.create(spec, {
  name: 'Manage Customer Groups',
  key: 'manage_customer_groups',
  description: `Add or remove a customer from customer groups. Customer groups are used for segmentation and access control. Use the list_customer_groups tool to discover available groups.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      customerId: z.string().describe('Plain customer ID'),
      addGroupIds: z
        .array(z.string())
        .optional()
        .describe('Customer group IDs to add the customer to'),
      removeGroupIds: z
        .array(z.string())
        .optional()
        .describe('Customer group IDs to remove the customer from')
    })
  )
  .output(
    z.object({
      added: z.number().describe('Number of groups the customer was added to'),
      removed: z.number().describe('Number of groups the customer was removed from')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let added = 0;
    let removed = 0;

    if (ctx.input.addGroupIds && ctx.input.addGroupIds.length > 0) {
      await client.addCustomerToCustomerGroups({
        customerId: ctx.input.customerId,
        customerGroupIdentifiers: ctx.input.addGroupIds.map(id => ({ customerGroupId: id }))
      });
      added = ctx.input.addGroupIds.length;
    }

    if (ctx.input.removeGroupIds && ctx.input.removeGroupIds.length > 0) {
      await client.removeCustomerFromCustomerGroups({
        customerId: ctx.input.customerId,
        customerGroupIdentifiers: ctx.input.removeGroupIds.map(id => ({ customerGroupId: id }))
      });
      removed = ctx.input.removeGroupIds.length;
    }

    return {
      output: { added, removed },
      message: `Customer group memberships updated: **${added}** added, **${removed}** removed`
    };
  })
  .build();

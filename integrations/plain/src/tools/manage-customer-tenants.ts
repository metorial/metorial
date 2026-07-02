import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageCustomerTenants = SlateTool.create(spec, {
  name: 'Manage Customer Tenants',
  key: 'manage_customer_tenants',
  description: `Add or remove a customer from tenants. Customers can belong to multiple tenants. Provide tenant identifiers to add or remove.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      customerId: z.string().describe('Plain customer ID'),
      addTenantIds: z
        .array(z.string())
        .optional()
        .describe('Tenant IDs to add the customer to'),
      removeTenantIds: z
        .array(z.string())
        .optional()
        .describe('Tenant IDs to remove the customer from')
    })
  )
  .output(
    z.object({
      added: z.number().describe('Number of tenants the customer was added to'),
      removed: z.number().describe('Number of tenants the customer was removed from')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let added = 0;
    let removed = 0;

    if (ctx.input.addTenantIds && ctx.input.addTenantIds.length > 0) {
      await client.addCustomerToTenants({
        customerId: ctx.input.customerId,
        tenantIdentifiers: ctx.input.addTenantIds.map(id => ({ tenantId: id }))
      });
      added = ctx.input.addTenantIds.length;
    }

    if (ctx.input.removeTenantIds && ctx.input.removeTenantIds.length > 0) {
      await client.removeCustomerFromTenants({
        customerId: ctx.input.customerId,
        tenantIdentifiers: ctx.input.removeTenantIds.map(id => ({ tenantId: id }))
      });
      removed = ctx.input.removeTenantIds.length;
    }

    return {
      output: { added, removed },
      message: `Customer tenant memberships updated: **${added}** added, **${removed}** removed`
    };
  })
  .build();

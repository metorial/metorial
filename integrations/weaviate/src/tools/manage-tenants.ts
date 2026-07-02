import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageTenants = SlateTool.create(spec, {
  name: 'Manage Tenants',
  key: 'manage_tenants',
  description: `Manage tenants in a multi-tenant collection. Supports listing, adding, updating status, and removing tenants. Each tenant provides data isolation with its own shard.

Tenant statuses: **ACTIVE** (available), **INACTIVE** (stored locally but not loaded), **OFFLOADED** (moved to cold storage).`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      collectionName: z.string().describe('Name of the multi-tenant collection'),
      action: z
        .enum(['list', 'add', 'update', 'remove'])
        .describe('Tenant operation to perform'),
      tenants: z
        .array(
          z.object({
            name: z.string().describe('Tenant name'),
            activityStatus: z
              .enum(['ACTIVE', 'INACTIVE', 'OFFLOADED'])
              .optional()
              .describe('Tenant activity status (for add/update)')
          })
        )
        .optional()
        .describe('Tenant definitions (required for add, update, and remove actions)')
    })
  )
  .output(
    z.object({
      tenants: z
        .array(
          z.object({
            name: z.string().describe('Tenant name'),
            activityStatus: z.string().optional().describe('Current activity status')
          })
        )
        .optional()
        .describe('Tenants list (for list action)'),
      tenantsAffected: z.number().optional().describe('Number of tenants affected'),
      action: z.string().describe('Action performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { collectionName, action, tenants } = ctx.input;

    switch (action) {
      case 'list': {
        let result = await client.listTenants(collectionName);
        return {
          output: {
            tenants: result,
            action: 'list'
          },
          message: `Found **${result.length}** tenant(s) in **${collectionName}**.`
        };
      }
      case 'add': {
        if (!tenants || tenants.length === 0)
          throw new Error('Tenants array is required for add action');
        let payload = tenants.map(t => ({
          name: t.name,
          activityStatus: t.activityStatus || 'ACTIVE'
        }));
        await client.addTenants(collectionName, payload);
        return {
          output: {
            tenantsAffected: tenants.length,
            action: 'add'
          },
          message: `Added **${tenants.length}** tenant(s) to **${collectionName}**.`
        };
      }
      case 'update': {
        if (!tenants || tenants.length === 0)
          throw new Error('Tenants array is required for update action');
        let payload = tenants.map(t => ({
          name: t.name,
          activityStatus: t.activityStatus || 'ACTIVE'
        }));
        await client.updateTenants(collectionName, payload);
        return {
          output: {
            tenantsAffected: tenants.length,
            action: 'update'
          },
          message: `Updated **${tenants.length}** tenant(s) in **${collectionName}**.`
        };
      }
      case 'remove': {
        if (!tenants || tenants.length === 0)
          throw new Error('Tenants array is required for remove action');
        let tenantNames = tenants.map(t => t.name);
        await client.deleteTenants(collectionName, tenantNames);
        return {
          output: {
            tenantsAffected: tenants.length,
            action: 'remove'
          },
          message: `Removed **${tenants.length}** tenant(s) from **${collectionName}**.`
        };
      }
    }
  })
  .build();

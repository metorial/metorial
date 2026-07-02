import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { CoupaClient } from '../lib/client';
import { spec } from '../spec';

export let supplierChanges = SlateTrigger.create(spec, {
  name: 'Supplier Changes',
  key: 'supplier_changes',
  description: 'Triggers when supplier records are created or updated in Coupa.'
})
  .input(
    z.object({
      supplierId: z.number().describe('Supplier ID'),
      name: z.string().nullable().optional().describe('Supplier name'),
      status: z.string().nullable().optional().describe('Current status'),
      updatedAt: z.string().describe('Last update timestamp'),
      rawData: z.any().describe('Full supplier data')
    })
  )
  .output(
    z.object({
      supplierId: z.number().describe('Coupa supplier ID'),
      name: z.string().nullable().optional().describe('Supplier name'),
      supplierNumber: z.string().nullable().optional().describe('Supplier number'),
      status: z.string().nullable().optional().describe('Status'),
      displayName: z.string().nullable().optional().describe('Display name'),
      primaryContact: z.any().nullable().optional().describe('Primary contact'),
      primaryAddress: z.any().nullable().optional().describe('Primary address'),
      website: z.string().nullable().optional().describe('Website'),
      createdAt: z.string().nullable().optional().describe('Creation timestamp'),
      updatedAt: z.string().nullable().optional().describe('Last update timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new CoupaClient({
        token: ctx.auth.token,
        instanceUrl: ctx.config.instanceUrl
      });

      let lastPollTime = ctx.state?.lastPollTime as string | undefined;
      let filters: Record<string, string> = {};

      if (lastPollTime) {
        filters['updated-at[gt]'] = lastPollTime;
      }

      let results = await client.listSuppliers({
        filters,
        orderBy: 'updated_at',
        dir: 'asc',
        limit: 50
      });

      let suppliers = Array.isArray(results) ? results : [];

      let newLastPollTime = lastPollTime;
      if (suppliers.length > 0) {
        let lastSupplier = suppliers[suppliers.length - 1];
        newLastPollTime =
          lastSupplier['updated-at'] ?? lastSupplier.updated_at ?? lastPollTime;
      }

      return {
        inputs: suppliers.map((s: any) => ({
          supplierId: s.id,
          name: s.name ?? null,
          status: s.status ?? null,
          updatedAt: s['updated-at'] ?? s.updated_at ?? '',
          rawData: s
        })),
        updatedState: {
          lastPollTime: newLastPollTime ?? new Date().toISOString()
        }
      };
    },

    handleEvent: async ctx => {
      let s = ctx.input.rawData;

      return {
        type: 'supplier.updated',
        id: `supplier-${ctx.input.supplierId}-${ctx.input.updatedAt}`,
        output: {
          supplierId: ctx.input.supplierId,
          name: ctx.input.name,
          supplierNumber: s.number ?? null,
          status: ctx.input.status,
          displayName: s['display-name'] ?? s.display_name ?? null,
          primaryContact: s['primary-contact'] ?? s.primary_contact ?? null,
          primaryAddress: s['primary-address'] ?? s.primary_address ?? null,
          website: s['website-url'] ?? s.website_url ?? null,
          createdAt: s['created-at'] ?? s.created_at ?? null,
          updatedAt: ctx.input.updatedAt
        }
      };
    }
  })
  .build();

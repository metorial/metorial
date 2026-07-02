import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageFilters = SlateTool.create(spec, {
  name: 'Manage Filters',
  key: 'manage_filters',
  description: `List, enable, or disable DNS filters on a profile. Filters are pre-configured categories like Ads & Trackers, Malware, Adult Content, etc. You can list both native and third-party filters, or batch-enable/disable multiple filters at once.`,
  instructions: [
    'Use operation "list" to see all available filters and their current status.',
    'Use operation "update" with the filters array to enable/disable filters in batch.'
  ]
})
  .input(
    z.object({
      operation: z.enum(['list', 'update']).describe('Operation to perform'),
      profileId: z.string().describe('Profile ID'),
      includeExternal: z
        .boolean()
        .optional()
        .describe('Include third-party filters when listing (default: false)'),
      filters: z
        .array(
          z.object({
            filterId: z
              .string()
              .describe('Filter identifier (e.g., "ads", "malware", "porn_strict")'),
            enabled: z.boolean().describe('Whether to enable or disable the filter')
          })
        )
        .optional()
        .describe('Filters to update (required for update operation)')
    })
  )
  .output(
    z.object({
      filters: z.array(
        z.object({
          filterId: z.string().describe('Filter identifier'),
          name: z.string().describe('Filter name'),
          description: z.string().describe('Filter description'),
          enabled: z.boolean().describe('Whether the filter is enabled')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { operation, profileId, includeExternal, filters: filterUpdates } = ctx.input;

    if (operation === 'update') {
      if (!filterUpdates || filterUpdates.length === 0) {
        throw new Error('Filters array is required for update operation');
      }
      let mapped = filterUpdates.map(f => ({
        filter: f.filterId,
        status: f.enabled ? 1 : 0
      }));
      await client.batchModifyFilters(profileId, mapped);

      let allFilters = await client.listFilters(profileId);
      let result = allFilters.map(f => ({
        filterId: f.PK,
        name: f.name,
        description: f.description || '',
        enabled: f.status === 1
      }));

      return {
        output: { filters: result },
        message: `Updated **${filterUpdates.length}** filter(s) on profile ${profileId}.`
      };
    }

    let nativeFilters = await client.listFilters(profileId);
    let result = nativeFilters.map(f => ({
      filterId: f.PK,
      name: f.name,
      description: f.description || '',
      enabled: f.status === 1
    }));

    if (includeExternal) {
      let externalFilters = await client.listExternalFilters(profileId);
      let externalMapped = externalFilters.map(f => ({
        filterId: f.PK,
        name: f.name,
        description: f.description || '',
        enabled: f.status === 1
      }));
      result = [...result, ...externalMapped];
    }

    return {
      output: { filters: result },
      message: `Found **${result.length}** filter(s) on profile ${profileId}.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapDestination, mapSavedSearch, mapSystem } from '../lib/schemas';
import { spec } from '../spec';
import { destinationSchema } from './list-destinations';
import { savedSearchSchema } from './manage-saved-searches';
import { systemSchema } from './manage-systems';

export const getSystem = SlateTool.create(spec, {
  name: 'Get System',
  key: 'get_system',
  description: 'Retrieve a registered sender, its current settings and last event timestamp.',
  tags: { readOnly: true }
})
  .input(z.object({ systemId: z.number().describe('ID of the system to retrieve') }))
  .output(systemSchema)
  .handleInvocation(async ctx => {
    const system = await new Client(ctx.auth).getSystem(ctx.input.systemId);
    return { output: mapSystem(system), message: `Retrieved system **${system.name}**.` };
  })
  .build();
export const getSavedSearch = SlateTool.create(spec, {
  name: 'Get Saved Search',
  key: 'get_saved_search',
  description: 'Retrieve a saved search query and its group scope.',
  tags: { readOnly: true }
})
  .input(z.object({ searchId: z.number().describe('ID of the saved search to retrieve') }))
  .output(savedSearchSchema)
  .handleInvocation(async ctx => {
    const search = await new Client(ctx.auth).getSavedSearch(ctx.input.searchId);
    return {
      output: mapSavedSearch(search),
      message: `Retrieved saved search **${search.name}**.`
    };
  })
  .build();
export const getDestination = SlateTool.create(spec, {
  name: 'Get Log Destination',
  key: 'get_destination',
  description:
    'Retrieve a log destination and its syslog connection details. Destination configuration is managed in Papertrail account settings.',
  tags: { readOnly: true }
})
  .input(
    z.object({ destinationId: z.number().describe('ID of the log destination to retrieve') })
  )
  .output(destinationSchema)
  .handleInvocation(async ctx => {
    const destination = await new Client(ctx.auth).getDestination(ctx.input.destinationId);
    return {
      output: mapDestination(destination),
      message: `Retrieved log destination **${destination.id}**.`
    };
  })
  .build();
export const getUsage = SlateTool.create(spec, {
  name: 'Get Log Transfer Usage',
  key: 'get_usage',
  description:
    'Retrieve log transfer usage and limits in bytes for the current billing period. Additional usage is included when enabled, so usage may exceed 100 percent.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      logDataTransferUsed: z.number().describe('Log transfer used in bytes'),
      logDataTransferUsedPercent: z
        .number()
        .optional()
        .describe('Percentage of the plan limit used; may exceed 100'),
      logDataTransferPlanLimit: z.number().describe('Plan transfer limit in bytes'),
      logDataTransferHardLimit: z.number().describe('Hard transfer limit in bytes')
    })
  )
  .handleInvocation(async ctx => {
    const usage = await new Client(ctx.auth).getUsage();
    return {
      output: {
        logDataTransferUsed: usage.log_data_transfer_used,
        logDataTransferUsedPercent: usage.log_data_transfer_used_percent,
        logDataTransferPlanLimit: usage.log_data_transfer_plan_limit,
        logDataTransferHardLimit: usage.log_data_transfer_hard_limit
      },
      message: `Retrieved usage of **${usage.log_data_transfer_used}** bytes for the current billing period.`
    };
  })
  .build();

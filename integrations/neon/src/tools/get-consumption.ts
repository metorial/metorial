import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeonClient } from '../lib/client';
import { spec } from '../spec';

let projectConsumptionSchema = z.object({
  projectId: z.string().describe('ID of the project'),
  periodId: z.string().optional().describe('Billing period identifier'),
  computeTime: z.number().optional().describe('Total compute time in seconds'),
  activeTime: z.number().optional().describe('Total active time in seconds'),
  dataStorageBytesHour: z.number().optional().describe('Data storage usage in byte-hours'),
  syntheticStorageSize: z.number().optional().describe('Synthetic storage size in bytes'),
  writtenData: z.number().optional().describe('Total data written in bytes'),
  dataTransfer: z.number().optional().describe('Total data transferred in bytes')
});

export let getConsumption = SlateTool.create(spec, {
  name: 'Get Consumption',
  key: 'get_consumption',
  description: `Retrieves consumption metrics across all projects for the account. Tracks compute time, active time, storage, written data, and data transfer. Available on Neon paid plans.`,
  instructions: [
    'Requires a paid Neon plan. Will fail on free-tier accounts.',
    'The from/to parameters use ISO 8601 date format.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      from: z
        .string()
        .optional()
        .describe('Start date for the metrics period in ISO 8601 format'),
      to: z.string().optional().describe('End date for the metrics period in ISO 8601 format'),
      orgId: z.string().optional().describe('Organization ID to filter consumption by'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of project consumption records to return'),
      cursor: z.string().optional().describe('Pagination cursor for fetching next page')
    })
  )
  .output(
    z.object({
      projects: z.array(projectConsumptionSchema).describe('Consumption metrics per project'),
      cursor: z.string().optional().describe('Pagination cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeonClient({ token: ctx.auth.token });
    let result = await client.getAccountConsumption({
      from: ctx.input.from,
      to: ctx.input.to,
      orgId: ctx.input.orgId,
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let projects = (result.projects || []).map((p: any) => ({
      projectId: p.project_id,
      periodId: p.period_id,
      computeTime: p.compute_time,
      activeTime: p.active_time,
      dataStorageBytesHour: p.data_storage_bytes_hour,
      syntheticStorageSize: p.synthetic_storage_size,
      writtenData: p.written_data,
      dataTransfer: p.data_transfer
    }));

    return {
      output: {
        projects,
        cursor: result.pagination?.cursor
      },
      message: `Retrieved consumption metrics for **${projects.length}** project(s).`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listBatches = SlateTool.create(spec, {
  name: 'List Batches',
  key: 'list_batches',
  description: `List batches in Scale AI, optionally filtered by project and status. Supports pagination and can include detailed progress information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectName: z.string().optional().describe('Filter by project name'),
      status: z
        .enum(['staging', 'in_progress', 'completed'])
        .optional()
        .describe('Filter by batch status'),
      detailed: z
        .boolean()
        .optional()
        .describe('Include detailed progress information for each batch'),
      startTime: z.string().optional().describe('Minimum creation date (ISO 8601)'),
      endTime: z.string().optional().describe('Maximum creation date (ISO 8601)'),
      limit: z.number().optional().describe('Max number of batches to return'),
      offset: z.number().optional().describe('Number of batches to skip (for pagination)')
    })
  )
  .output(
    z.object({
      batches: z
        .array(
          z
            .object({
              batchName: z.string().describe('Name of the batch'),
              projectName: z.string().optional().describe('Associated project name'),
              status: z.string().optional().describe('Batch status'),
              createdAt: z.string().optional().describe('ISO 8601 creation timestamp')
            })
            .passthrough()
        )
        .describe('List of batches')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listBatches({
      project: ctx.input.projectName,
      status: ctx.input.status,
      detailed: ctx.input.detailed,
      startTime: ctx.input.startTime,
      endTime: ctx.input.endTime,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let batches = Array.isArray(result) ? result : (result.docs ?? result);

    let mapped = (Array.isArray(batches) ? batches : []).map((b: any) => ({
      batchName: b.name,
      projectName: b.project,
      status: b.status,
      createdAt: b.created_at,
      ...b
    }));

    return {
      output: { batches: mapped },
      message: `Found **${mapped.length}** batch(es).`
    };
  })
  .build();

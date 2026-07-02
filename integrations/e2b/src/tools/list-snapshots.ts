import { SlateTool } from 'slates';
import { z } from 'zod';
import { E2BClient } from '../lib/client';
import { spec } from '../spec';

export let listSnapshots = SlateTool.create(spec, {
  name: 'List Snapshots',
  key: 'list_snapshots',
  description: `List persistent snapshots. Optionally filter by sandbox ID or template ID. Snapshots capture the full state of a sandbox and can be used to create new sandboxes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sandboxId: z
        .string()
        .optional()
        .describe('Filter snapshots by the sandbox they were created from.'),
      templateId: z.string().optional().describe('Filter snapshots by template ID.'),
      limit: z.number().optional().describe('Maximum number of snapshots to return.'),
      nextToken: z.string().optional().describe('Pagination token from a previous response.')
    })
  )
  .output(
    z.object({
      snapshots: z
        .array(
          z.object({
            snapshotId: z.string().describe('Unique identifier of the snapshot.'),
            sandboxId: z.string().describe('ID of the sandbox the snapshot was created from.'),
            templateId: z.string().describe('Template ID associated with the snapshot.'),
            createdAt: z
              .string()
              .describe('ISO 8601 timestamp when the snapshot was created.'),
            metadata: z
              .record(z.string(), z.string())
              .optional()
              .describe('Metadata associated with the snapshot.')
          })
        )
        .describe('List of snapshots.'),
      nextToken: z.string().optional().describe('Token to fetch the next page of results.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new E2BClient({ token: ctx.auth.token });

    ctx.progress('Fetching snapshots...');
    let result = await client.listSnapshots({
      sandboxId: ctx.input.sandboxId,
      templateId: ctx.input.templateId,
      limit: ctx.input.limit,
      nextToken: ctx.input.nextToken
    });

    return {
      output: result,
      message: `Found **${result.snapshots.length}** snapshot(s)${result.nextToken ? ' (more results available)' : ''}.`
    };
  })
  .build();

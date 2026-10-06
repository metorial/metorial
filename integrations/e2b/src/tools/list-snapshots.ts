import { SlateTool } from 'slates';
import { z } from 'zod';
import { E2BClient } from '../lib/client';
import { spec } from '../spec';

export let listSnapshots = SlateTool.create(spec, {
  name: 'List Snapshots',
  key: 'list_snapshots',
  description: `List persistent snapshots. Optionally filter by source sandbox ID or snapshot name. Snapshots capture the full state of a sandbox and can be used to create new sandboxes.`,
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
      templateId: z
        .string()
        .optional()
        .describe('Unsupported legacy filter. Omit this field and use sandboxId or name.'),
      name: z
        .string()
        .min(1)
        .optional()
        .describe('Filter by snapshot name or ID, optionally including namespace and tag.'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of snapshots to return.'),
      nextToken: z.string().optional().describe('Pagination token from a previous response.')
    })
  )
  .output(
    z.object({
      snapshots: z
        .array(
          z.object({
            snapshotId: z
              .string()
              .describe(
                'Snapshot template identifier including its tag. Pass this as templateId to create_sandbox.'
              ),
            names: z
              .array(z.string())
              .describe('Names of the snapshot template including namespace and tag.'),
            sandboxId: z
              .string()
              .describe(
                'Source sandbox ID when supplied as a filter; otherwise empty because E2B does not return it.'
              ),
            templateId: z
              .string()
              .describe(
                'Legacy field, empty because E2B does not return a separate template ID. Use snapshotId to create a sandbox.'
              ),
            createdAt: z
              .string()
              .describe(
                'Legacy field, empty because E2B does not return a creation timestamp.'
              ),
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
      name: ctx.input.name,
      limit: ctx.input.limit,
      nextToken: ctx.input.nextToken
    });

    return {
      output: result,
      message: `Found **${result.snapshots.length}** snapshot(s)${result.nextToken ? ' (more results available)' : ''}.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { E2BClient } from '../lib/client';
import { spec } from '../spec';

export let listSandboxes = SlateTool.create(spec, {
  name: 'List Sandboxes',
  key: 'list_sandboxes',
  description: `List sandboxes associated with the authenticated team. Filter by state (running, paused) or metadata.
Supports pagination for large result sets.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      state: z
        .array(z.enum(['running', 'paused']))
        .optional()
        .describe('Filter sandboxes by state. Omit to list all.'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Filter sandboxes by metadata key-value pairs.'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of sandboxes to return (max 100).'),
      nextToken: z
        .string()
        .optional()
        .describe('Pagination token from a previous response to fetch the next page.')
    })
  )
  .output(
    z.object({
      sandboxes: z
        .array(
          z.object({
            sandboxId: z.string().describe('Unique identifier of the sandbox.'),
            templateId: z.string().describe('Template ID used to create the sandbox.'),
            name: z.string().describe('Name or alias of the template.'),
            clientId: z.string().describe('Client identifier.'),
            startedAt: z.string().describe('ISO 8601 timestamp when the sandbox started.'),
            endAt: z.string().describe('ISO 8601 timestamp when the sandbox expires.'),
            cpuCount: z.number().optional().describe('Number of vCPUs allocated.'),
            memoryMb: z.number().optional().describe('Memory allocated in megabytes.'),
            metadata: z
              .record(z.string(), z.string())
              .optional()
              .describe('Metadata attached to the sandbox.'),
            state: z
              .string()
              .optional()
              .describe('Current state of the sandbox (running, paused).')
          })
        )
        .describe('List of sandboxes matching the filter criteria.'),
      nextToken: z
        .string()
        .optional()
        .describe('Token to fetch the next page of results, if more are available.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new E2BClient({ token: ctx.auth.token });

    ctx.progress('Fetching sandboxes...');
    let result = await client.listSandboxes({
      state: ctx.input.state,
      metadata: ctx.input.metadata,
      limit: ctx.input.limit,
      nextToken: ctx.input.nextToken
    });

    return {
      output: result,
      message: `Found **${result.sandboxes.length}** sandbox(es)${result.nextToken ? ' (more results available)' : ''}.`
    };
  })
  .build();

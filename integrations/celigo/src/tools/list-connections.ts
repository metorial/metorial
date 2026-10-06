import { SlateTool } from 'slates';
import { z } from 'zod';
import { invoke } from '../lib/invocation';
import { fail } from '../lib/validation';
import { spec } from '../spec';

const outputSchema = z.object({
  nextPageUrl: z.string().optional().describe('Next native page, when present.'),
  connections: z
    .array(
      z.object({
        connectionId: z.string().describe('Unique connection identifier'),
        name: z.string().optional().describe('Connection name'),
        type: z
          .string()
          .optional()
          .describe('Connection type (e.g., http, rest, netsuite, salesforce)'),
        lastModified: z.string().optional().describe('Last modification timestamp'),
        offline: z.boolean().optional().describe('Whether the connection is offline')
      })
    )
    .describe('List of connections')
});

export let listConnections = SlateTool.create(spec, {
  name: 'List Connections',
  key: 'list_connections',
  description: `Retrieve a page of connections in your Celigo account. Connections store credentials and configuration needed to access the applications you are integrating.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .describe('Maximum records on this native page.'),
      externalId: z.string().optional().describe('Exact native externalId filter.'),
      nextPageUrl: z
        .string()
        .optional()
        .describe('Next URL from the preceding page, with the same filters and limit.')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    const result = await invoke('list_connections', ctx);
    const parsed = outputSchema.safeParse(result.output);
    if (!parsed.success)
      throw fail(
        'Celigo returned an invalid result. Reconcile any requested write before repeating it.'
      );
    return { ...result, output: parsed.data };
  })
  .build();

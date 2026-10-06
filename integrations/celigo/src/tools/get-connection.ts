import { SlateTool } from 'slates';
import { z } from 'zod';
import { invoke } from '../lib/invocation';
import { fail } from '../lib/validation';
import { spec } from '../spec';

const outputSchema = z.object({
  connectionId: z.string().describe('Unique connection identifier'),
  name: z.string().optional().describe('Connection name'),
  type: z.string().optional().describe('Connection type'),
  lastModified: z.string().optional().describe('Last modification timestamp'),
  offline: z.boolean().optional().describe('Whether the connection is offline'),
  pingResult: z.any().optional().describe('Result of the connection ping test, if requested'),
  rawConnection: z.any().describe('Credential-filtered native connection object')
});

export let getConnection = SlateTool.create(spec, {
  name: 'Get Connection',
  key: 'get_connection',
  description: `Retrieve details of a specific connection by its ID, and optionally test whether it is operational.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      connectionId: z.string().describe('ID of the connection to retrieve'),
      testConnection: z
        .boolean()
        .optional()
        .default(false)
        .describe('If true, also ping the connection to verify it is operational')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    const result = await invoke('get_connection', ctx);
    const parsed = outputSchema.safeParse(result.output);
    if (!parsed.success)
      throw fail(
        'Celigo returned an invalid result. Reconcile any requested write before repeating it.'
      );
    return { ...result, output: parsed.data };
  })
  .build();

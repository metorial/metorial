import { SlateTool } from 'slates';
import { z } from 'zod';
import { invoke } from '../lib/invocation';
import { fail } from '../lib/validation';
import { spec } from '../spec';

const outputSchema = z.object({
  registrationFailures: z
    .array(z.any())
    .optional()
    .describe(
      'Registrations that failed after the connection was created; creation is not rolled back.'
    ),
  connectionId: z.string().describe('ID of the newly created connection'),
  name: z.string().optional().describe('Name of the created connection'),
  type: z.string().optional().describe('Type of the created connection'),
  rawConnection: z.any().describe('Credential-filtered native connection object')
});

export let createConnection = SlateTool.create(spec, {
  name: 'Create Connection',
  key: 'create_connection',
  description: `Create a new connection in Celigo. The connection object structure varies by type (HTTP, REST, FTP, NetSuite, Salesforce, etc.). Provide the full connection configuration as the connection data object.`,
  instructions: [
    'The shape of the connection data depends on the connection type. Refer to the Celigo API documentation for the specific fields required.',
    'Common fields include: name, type, and type-specific configuration (e.g., rest.baseURI for HTTP connections).'
  ]
})
  .input(
    z.object({
      connectionData: z
        .record(z.string(), z.any())
        .describe(
          'Connection configuration object. Must include "name" and "type" at minimum, plus type-specific settings.'
        )
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    const result = await invoke('create_connection', ctx);
    const parsed = outputSchema.safeParse(result.output);
    if (!parsed.success)
      throw fail(
        'Celigo returned an invalid result. Reconcile any requested write before repeating it.'
      );
    return { ...result, output: parsed.data };
  })
  .build();

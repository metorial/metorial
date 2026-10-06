import { SlateTool } from 'slates';
import { z } from 'zod';
import { invoke } from '../lib/invocation';
import { fail } from '../lib/validation';
import { spec } from '../spec';

const outputSchema = z.object({
  region: z.string(),
  apiVersion: z.string(),
  userId: z.string().describe('User ID associated with the token'),
  scope: z.string().optional().describe('Token scope, only if returned by the provider'),
  rawTokenInfo: z.any().describe('Validated native token context')
});

export let getTokenInfo = SlateTool.create(spec, {
  name: 'Get Token Info',
  key: 'get_token_info',
  description: `Verify the current API token and retrieve its associated user ID and scope. Useful for confirming authentication is working and retrieving native token-owner context. Token mode, environment and permissions are not inferred from absent fields.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(outputSchema)
  .handleInvocation(async ctx => {
    const result = await invoke('get_token_info', ctx);
    const parsed = outputSchema.safeParse(result.output);
    if (!parsed.success)
      throw fail(
        'Celigo returned an invalid result. Reconcile any requested write before repeating it.'
      );
    return { ...result, output: parsed.data };
  })
  .build();

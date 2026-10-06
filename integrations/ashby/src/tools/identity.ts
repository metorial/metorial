import { SlateTool } from 'slates';
import { z } from 'zod';
import { AshbyClient } from '../lib/client';
import { row, str, unexpected, warningsSchema } from '../lib/contracts';
import { spec } from '../spec';

export const getCurrentApiKey = SlateTool.create(spec, {
  key: 'get_current_api_key',
  name: 'Get Current API Key Identity',
  description:
    'Shows the connected API key title, creation time, endpoint permissions and observed API version. Requires apiKeysRead. It does not identify a human user or reveal the key.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      title: z.string(),
      createdAt: z.string(),
      permissions: z.array(z.string()),
      apiVersion: z.string(),
      warnings: warningsSchema
    })
  )
  .handleInvocation(async ctx => {
    const client = new AshbyClient(ctx.auth),
      value = row((await client.post('/apiKey.info')).results);
    if (!Array.isArray(value.scopes) || value.scopes.some(scope => typeof scope !== 'string'))
      unexpected();
    return {
      output: {
        title: str(value.title),
        createdAt: str(value.createdAt),
        permissions: value.scopes as string[],
        apiVersion: str(value.version),
        warnings: client.warnings
      },
      message: 'Retrieved the connected API key identity and endpoint permissions.'
    };
  })
  .build();

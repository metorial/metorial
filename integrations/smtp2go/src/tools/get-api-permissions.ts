import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getApiPermissions = SlateTool.create(spec, {
  name: 'Get API Permissions',
  key: 'get_api_permissions',
  description:
    'List the API endpoints available to the connected SMTP2GO API key. Use this to diagnose permission errors before sending messages or managing account resources.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      endpoints: z.array(z.string()).describe('API endpoint permissions for this key')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    let result = await client.getApiPermissions();
    return {
      output: { endpoints: result.data },
      message: 'Retrieved the connected API key permissions.'
    };
  })
  .build();

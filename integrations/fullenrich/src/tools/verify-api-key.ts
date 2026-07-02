import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let verifyApiKey = SlateTool.create(spec, {
  name: 'Verify API Key',
  key: 'verify_api_key',
  description: `Verify whether the configured API key is valid and active. Returns the associated workspace ID on success.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      workspaceId: z.string().describe('Workspace ID associated with the API key')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.verifyApiKey();

    return {
      output: {
        workspaceId: result.workspaceId
      },
      message: `API key is valid. Workspace ID: \`${result.workspaceId}\``
    };
  })
  .build();

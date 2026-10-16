import { SlateTool } from 'slates';
import { z } from 'zod';
import { GistClient } from '../lib/client';
import { requiredId } from '../lib/response';
import { spec } from '../spec';

export let getWorkspace = SlateTool.create(spec, {
  name: 'Get Workspace',
  key: 'get_workspace',
  description:
    'Identify the Gist workspace authorized by this connection and inspect the token scopes and metadata.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      workspaceId: z.string(),
      tokenType: z.string().optional(),
      scopes: z.string().optional(),
      appId: z.string().optional(),
      createdAt: z.string().optional(),
      expiresIn: z.string().optional(),
      rawResponse: z.any()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GistClient({ token: ctx.auth.token });
    let data = await client.getWorkspaceMeta();
    return {
      output: {
        workspaceId: requiredId(data.workspace_id),
        tokenType: data.token_type,
        scopes: data.scope,
        appId: data.app_id === undefined ? undefined : requiredId(data.app_id),
        createdAt: data.created_at === undefined ? undefined : String(data.created_at),
        expiresIn: data.expires_in === undefined ? undefined : String(data.expires_in),
        rawResponse: client.responses
      },
      message: `Retrieved workspace **${requiredId(data.workspace_id)}**.`
    };
  })
  .build();

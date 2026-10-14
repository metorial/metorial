import { SlateTool } from 'slates';
import { z } from 'zod';
import { PdflessClient } from '../lib/client';
import { spec } from '../spec';

export let getWorkspace = SlateTool.create(spec, {
  name: 'Get Workspace',
  key: 'get_workspace',
  description:
    'Retrieve the workspace associated with the connected API key, including its name, active status, and creation time.',
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      name: z.string().nullable().describe('Workspace name, or null if unnamed'),
      active: z.boolean().describe('Whether this workspace is active'),
      createdAt: z.string().describe('Workspace creation timestamp'),
      modifiedAt: z.string().optional().describe('Workspace modification timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PdflessClient({ token: ctx.auth.token });
    let result = await client.getWorkspace();
    return {
      output: result,
      message: `Workspace **${result.name ?? 'Unnamed workspace'}** is ${result.active ? 'active' : 'inactive'}.`
    };
  })
  .build();

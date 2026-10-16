import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listWorkspaces = SlateTool.create(spec, {
  name: 'List Workspaces',
  key: 'list_workspaces',
  description:
    'List the workspaces accessible to the current API key. Use the returned workspace IDs with list_links and get_click_analytics.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({ data: z.json().describe('Workspace information exactly as returned by U301.') })
  )
  .handleInvocation(async ctx => {
    let data = await new Client({ token: ctx.auth.token }).listWorkspaces();
    return { output: { data }, message: 'Retrieved accessible workspace information.' };
  })
  .build();

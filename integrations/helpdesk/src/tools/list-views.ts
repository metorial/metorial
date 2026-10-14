import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listViews = SlateTool.create(spec, {
  name: 'List Views',
  key: 'list_views',
  description:
    'List the saved HelpDesk ticket views available to this connection, including their IDs, names, and ticket filters.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      views: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          agentID: z.string().optional(),
          filters: z.record(z.string(), z.unknown()).optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let views = (await client.listSavedViews()).map(view => ({
      id: view.ID,
      name: view.name,
      agentID: view.agentID,
      filters: view.filters,
      createdAt: view.createdAt,
      updatedAt: view.updatedAt
    }));
    return { output: { views }, message: `Found **${views.length}** saved view(s).` };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { WrikeClient } from '../lib/client';
import { spec } from '../spec';

export let listSpaces = SlateTool.create(spec, {
  name: 'List Spaces',
  key: 'list_spaces',
  description: `List all spaces in the Wrike account. Spaces are top-level organizational containers that hold folders and projects.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      spaces: z.array(
        z.object({
          spaceId: z.string(),
          title: z.string(),
          accessType: z.string().optional(),
          archived: z.boolean().optional(),
          description: z.string().optional(),
          avatarUrl: z.string().optional()
        })
      ),
      count: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new WrikeClient({
      token: ctx.auth.token,
      host: ctx.auth.host
    });

    let result = await client.getSpaces();

    let spaces = result.data.map(s => ({
      spaceId: s.id,
      title: s.title,
      accessType: s.accessType,
      archived: s.archived,
      description: s.description,
      avatarUrl: s.avatarUrl
    }));

    return {
      output: { spaces, count: spaces.length },
      message: `Found **${spaces.length}** space(s).`
    };
  })
  .build();

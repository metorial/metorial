import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let moveMap = SlateTool.create(spec, {
  name: 'Move Map',
  key: 'move_map',
  description: `Move a Felt map to a different project or folder within the same workspace. Provide either a project ID or a folder ID as the destination.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      mapId: z.string().describe('ID of the map to move'),
      projectId: z.string().optional().describe('Destination project ID'),
      folderId: z.string().optional().describe('Destination folder ID')
    })
  )
  .output(
    z.object({
      mapId: z.string().describe('ID of the moved map'),
      title: z.string().nullable().describe('Title of the map'),
      url: z.string().describe('URL to view the map')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let map = await client.moveMap(ctx.input.mapId, {
      projectId: ctx.input.projectId,
      folderId: ctx.input.folderId
    });

    return {
      output: {
        mapId: map.id,
        title: map.title ?? null,
        url: map.url
      },
      message: `Moved map **${map.title || 'Untitled'}** to ${ctx.input.projectId ? `project \`${ctx.input.projectId}\`` : `folder \`${ctx.input.folderId}\``}.`
    };
  })
  .build();

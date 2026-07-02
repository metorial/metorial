import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let duplicateMap = SlateTool.create(spec, {
  name: 'Duplicate Map',
  key: 'duplicate_map',
  description: `Duplicate a Felt map with all its layers, elements, and configuration. Optionally set a new title and destination project or folder for the copy.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      mapId: z.string().describe('ID of the map to duplicate'),
      title: z
        .string()
        .optional()
        .describe('Title for the duplicated map (defaults to "[Original Title] (copy)")'),
      destinationProjectId: z
        .string()
        .optional()
        .describe('Project ID to place the duplicate in'),
      destinationFolderId: z
        .string()
        .optional()
        .describe('Folder ID to place the duplicate in')
    })
  )
  .output(
    z.object({
      mapId: z.string().describe('ID of the new duplicated map'),
      title: z.string().nullable().describe('Title of the duplicated map'),
      url: z.string().describe('URL to view the duplicated map')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let destination =
      ctx.input.destinationProjectId || ctx.input.destinationFolderId
        ? {
            projectId: ctx.input.destinationProjectId,
            folderId: ctx.input.destinationFolderId
          }
        : undefined;

    let map = await client.duplicateMap(ctx.input.mapId, {
      title: ctx.input.title,
      destination
    });

    return {
      output: {
        mapId: map.id,
        title: map.title ?? null,
        url: map.url
      },
      message: `Duplicated map as **${map.title || 'Untitled'}** — [Open in Felt](${map.url})`
    };
  })
  .build();

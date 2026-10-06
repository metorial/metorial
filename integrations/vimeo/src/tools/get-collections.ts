import { SlateTool } from 'slates';
import { z } from 'zod';
import { VimeoClient } from '../lib/client';
import { folderSchema, mapFolder, mapShowcase, showcaseSchema } from '../lib/schemas';
import { spec } from '../spec';

export const getFolderTool = SlateTool.create(spec, {
  name: 'Get Folder',
  key: 'get_folder',
  description:
    'Read an exact folder from the authenticated library. Call list_folders to discover its ID.',
  tags: { readOnly: true }
})
  .input(z.object({ folderId: z.string().describe('Native folder ID from list_folders') }))
  .output(folderSchema)
  .handleInvocation(async ctx => {
    const folder = mapFolder(
      await new VimeoClient(ctx.auth.token).getFolder(ctx.input.folderId)
    );
    return { output: folder, message: `Read folder **${folder.name}** (${folder.folderId}).` };
  })
  .build();
export const getShowcaseTool = SlateTool.create(spec, {
  name: 'Get Showcase',
  key: 'get_showcase',
  description:
    'Read an exact showcase from the authenticated library. Call list_showcases to discover its ID.',
  tags: { readOnly: true }
})
  .input(
    z.object({ showcaseId: z.string().describe('Native showcase ID from list_showcases') })
  )
  .output(showcaseSchema)
  .handleInvocation(async ctx => {
    const showcase = mapShowcase(
      await new VimeoClient(ctx.auth.token).getShowcase(ctx.input.showcaseId)
    );
    return {
      output: showcase,
      message: `Read showcase **${showcase.name}** (${showcase.showcaseId}).`
    };
  })
  .build();

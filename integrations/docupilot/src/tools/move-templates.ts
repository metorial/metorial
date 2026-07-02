import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let moveTemplates = SlateTool.create(spec, {
  name: 'Move Templates',
  key: 'move_templates',
  description: `Move one or more templates to a different folder. Pass null as the folder ID to move templates to the Home folder.`
})
  .input(
    z.object({
      templateIds: z.array(z.number()).min(1).describe('Array of template IDs to move'),
      folderId: z
        .number()
        .nullable()
        .describe('Target folder ID (null to move to Home folder)')
    })
  )
  .output(
    z.object({
      movedCount: z.number().describe('Number of templates moved'),
      folderId: z.number().nullable().describe('Target folder ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.auth.workspaceId
    });

    await client.moveTemplates(ctx.input.templateIds, ctx.input.folderId);

    return {
      output: {
        movedCount: ctx.input.templateIds.length,
        folderId: ctx.input.folderId
      },
      message: `Moved **${ctx.input.templateIds.length}** template(s) to ${ctx.input.folderId ? `folder ${ctx.input.folderId}` : 'Home folder'}.`
    };
  })
  .build();

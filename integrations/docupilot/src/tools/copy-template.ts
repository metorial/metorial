import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let copyTemplate = SlateTool.create(spec, {
  name: 'Copy Template',
  key: 'copy_template',
  description: `Create a duplicate of an existing template. Optionally give the copy a new title and/or place it in a different folder.`
})
  .input(
    z.object({
      templateId: z.number().describe('ID of the template to copy'),
      title: z
        .string()
        .optional()
        .describe('Title for the new copy (defaults to original title with "Copy" suffix)'),
      folderId: z.number().optional().describe('Folder ID to place the copy in')
    })
  )
  .output(
    z.object({
      templateId: z.number().describe('ID of the newly created template copy'),
      title: z.string().describe('Title of the copy'),
      type: z.string().describe('Template format type'),
      createdTime: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.auth.workspaceId
    });

    let template = await client.copyTemplate(ctx.input.templateId, {
      title: ctx.input.title,
      folder: ctx.input.folderId
    });

    return {
      output: {
        templateId: template.id,
        title: template.title,
        type: template.type,
        createdTime: template.created_time
      },
      message: `Copied template to **"${template.title}"** (ID: ${template.id}).`
    };
  })
  .build();

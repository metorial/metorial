import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let cloneTemplate = SlateTool.create(spec, {
  name: 'Clone Template',
  key: 'clone_template',
  description: `Create an independent copy of an existing document template. The cloned template can be given a new name, placed in a different folder, and assigned a custom external ID.`
})
  .input(
    z.object({
      templateId: z.number().describe('ID of the template to clone'),
      name: z
        .string()
        .optional()
        .describe('Name for the cloned template (defaults to original with "(Clone)" suffix)'),
      folderName: z.string().optional().describe('Folder for the cloned template'),
      externalId: z.string().optional().describe('External ID for the cloned template')
    })
  )
  .output(
    z.object({
      templateId: z.number().describe('New cloned template ID'),
      name: z.string().describe('Cloned template name'),
      slug: z.string().optional().describe('Cloned template slug'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.cloneTemplate(ctx.input.templateId, {
      name: ctx.input.name,
      folderName: ctx.input.folderName,
      externalId: ctx.input.externalId
    });

    return {
      output: {
        templateId: result.id,
        name: result.name,
        slug: result.slug,
        createdAt: result.created_at
      },
      message: `Cloned template into **"${result.name}"** (ID: ${result.id}).`
    };
  })
  .build();

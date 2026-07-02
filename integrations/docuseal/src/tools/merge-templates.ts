import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let mergeTemplates = SlateTool.create(spec, {
  name: 'Merge Templates',
  key: 'merge_templates',
  description: `Combine multiple templates into a single unified template containing all documents and fields from the source templates.`
})
  .input(
    z.object({
      templateIds: z.array(z.number()).describe('IDs of templates to merge together'),
      name: z.string().optional().describe('Name for the merged template'),
      folderName: z.string().optional().describe('Folder for the merged template'),
      externalId: z.string().optional().describe('External ID for the merged template'),
      sharedLink: z.boolean().optional().describe('Make merged template publicly accessible')
    })
  )
  .output(
    z.object({
      templateId: z.number().describe('New merged template ID'),
      name: z.string().describe('Merged template name'),
      slug: z.string().optional().describe('Merged template slug'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.mergeTemplates({
      templateIds: ctx.input.templateIds,
      name: ctx.input.name,
      folderName: ctx.input.folderName,
      externalId: ctx.input.externalId,
      sharedLink: ctx.input.sharedLink
    });

    return {
      output: {
        templateId: result.id,
        name: result.name,
        slug: result.slug,
        createdAt: result.created_at
      },
      message: `Merged ${ctx.input.templateIds.length} templates into **"${result.name}"** (ID: ${result.id}).`
    };
  })
  .build();

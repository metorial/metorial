import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateTemplate = SlateTool.create(spec, {
  name: 'Update Template',
  key: 'update_template',
  description: `Update an existing document template's name, folder, external ID, or submitter roles.`
})
  .input(
    z.object({
      templateId: z.number().describe('ID of the template to update'),
      name: z.string().optional().describe('New template name'),
      folderName: z.string().optional().describe('New folder name'),
      externalId: z.string().optional().describe('New external ID'),
      roles: z.array(z.string()).optional().describe('Updated submitter role names')
    })
  )
  .output(
    z.object({
      templateId: z.number().describe('Updated template ID'),
      name: z.string().describe('Template name'),
      updatedAt: z.string().describe('Last updated timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.updateTemplate(ctx.input.templateId, {
      name: ctx.input.name,
      folderName: ctx.input.folderName,
      externalId: ctx.input.externalId,
      roles: ctx.input.roles
    });

    return {
      output: {
        templateId: result.id,
        name: result.name,
        updatedAt: result.updated_at
      },
      message: `Updated template **"${result.name}"** (ID: ${result.id}).`
    };
  })
  .build();

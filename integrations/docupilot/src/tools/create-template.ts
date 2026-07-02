import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createTemplate = SlateTool.create(spec, {
  name: 'Create Template',
  key: 'create_template',
  description: `Create a new document template in Docupilot. Specify the title, output type, and optionally place it in a folder. After creation, use Docupilot's online builder or upload a template file to add content.`
})
  .input(
    z.object({
      title: z.string().describe('Title for the new template'),
      outputType: z
        .enum(['html', 'pdf', 'png', 'docx', 'pptx', 'xlsx'])
        .describe('Output format for generated documents'),
      description: z.string().optional().describe('Optional description for the template'),
      folderId: z.number().optional().describe('Folder ID to place the template in')
    })
  )
  .output(
    z.object({
      templateId: z.number().describe('ID of the newly created template'),
      title: z.string().describe('Template title'),
      type: z.string().describe('Template format type'),
      createdTime: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.auth.workspaceId
    });

    let template = await client.createTemplate({
      title: ctx.input.title,
      outputType: ctx.input.outputType,
      description: ctx.input.description,
      folder: ctx.input.folderId
    });

    return {
      output: {
        templateId: template.id,
        title: template.title,
        type: template.type,
        createdTime: template.created_time
      },
      message: `Created template **"${template.title}"** (ID: ${template.id}) with output type: ${ctx.input.outputType}.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let templateId = z
  .string()
  .describe('Template identifier from list_templates, get_template, or create_template');
let templateOutput = z.object({
  templateId: z.string(),
  name: z.string(),
  template: z
    .record(z.string(), z.unknown())
    .describe('Full template metadata returned by the provider')
});
let contentOutput = z.object({
  templateId: z.string(),
  content: z
    .record(z.string(), z.unknown())
    .describe('HTML, CSS, and sample data returned by the provider')
});
export let createTemplate = SlateTool.create(spec, {
  key: 'create_template',
  name: 'Create Template',
  description:
    'Create an empty template. For the html-editor, use update_template_content to set its HTML and CSS.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      name: z.string(),
      width: z.number().describe('Template width in whole pixels'),
      height: z.number().describe('Template height in whole pixels'),
      editor: z.enum(['html-editor', 'canvas-editor', 'canvas-html']),
      tags: z.array(z.string()).optional(),
      outputFormat: z
        .enum(['jpeg', 'png', 'webp', 'pdf', 'mp4', 'webm'])
        .optional()
        .describe('Video formats require canvas-html')
    })
  )
  .output(templateOutput)
  .handleInvocation(async ctx => {
    let template = await new Client(ctx.auth.token).createTemplate(ctx.input);
    return {
      output: { templateId: template.identifier, name: template.name, template },
      message: `Created template ${template.identifier}.`
    };
  })
  .build();
export let updateTemplate = SlateTool.create(spec, {
  key: 'update_template',
  name: 'Update Template',
  description:
    'Update template metadata. Only supplied fields change; tags replace the full existing set.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      templateId,
      name: z.string().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
      outputFormat: z.enum(['jpeg', 'png', 'pdf']).optional(),
      tags: z.array(z.string()).optional()
    })
  )
  .output(templateOutput)
  .handleInvocation(async ctx => {
    let { templateId, ...data } = ctx.input;
    let template = await new Client(ctx.auth.token).updateTemplate(templateId, data);
    return {
      output: { templateId: template.identifier, name: template.name, template },
      message: `Updated template ${template.identifier}.`
    };
  })
  .build();
export let deleteTemplate = SlateTool.create(spec, {
  key: 'delete_template',
  name: 'Delete Template',
  description: 'Delete a template from the account.',
  tags: { readOnly: false, destructive: true }
})
  .input(z.object({ templateId }))
  .output(z.object({ templateId: z.string(), deleted: z.boolean() }))
  .handleInvocation(async ctx => {
    await new Client(ctx.auth.token).deleteTemplate(ctx.input.templateId);
    return {
      output: { templateId: ctx.input.templateId, deleted: true },
      message: `Deleted template ${ctx.input.templateId}.`
    };
  })
  .build();
export let getTemplateContent = SlateTool.create(spec, {
  key: 'get_template_content',
  name: 'Get Template Content',
  description: 'Retrieve raw HTML, CSS, and sample merge data for an html-editor template.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({ templateId }))
  .output(contentOutput)
  .handleInvocation(async ctx => {
    let content = await new Client(ctx.auth.token).getTemplateContent(ctx.input.templateId);
    return {
      output: { templateId: ctx.input.templateId, content },
      message: `Retrieved content for template ${ctx.input.templateId}.`
    };
  })
  .build();
export let updateTemplateContent = SlateTool.create(spec, {
  key: 'update_template_content',
  name: 'Update Template Content',
  description:
    'Overwrite raw HTML and optional CSS/sample data for an html-editor template. Returns the persisted content.',
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      templateId,
      html: z.string(),
      css: z.string().optional(),
      sampleData: z.record(z.string(), z.unknown()).optional()
    })
  )
  .output(contentOutput)
  .handleInvocation(async ctx => {
    let { templateId, ...data } = ctx.input;
    let content = await new Client(ctx.auth.token).updateTemplateContent(templateId, data);
    return {
      output: { templateId, content },
      message: `Updated content for template ${templateId}.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { FlexisignClient } from '../lib/client';
import { spec } from '../spec';

export let getTemplate = SlateTool.create(spec, {
  name: 'Get Template',
  key: 'get_template',
  description: `Retrieve details of a specific document template by its ID. Returns the template metadata and body structure, which defines the fields and recipient roles required when sending a document from this template.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      templateId: z.string().describe('The ID of the template to retrieve')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('Unique identifier for the template'),
      templateName: z.string().describe('Display name of the template'),
      bodyStructure: z
        .record(z.string(), z.unknown())
        .describe(
          'Structure defining the fields, recipient roles, and configuration required to create a document from this template'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new FlexisignClient({ token: ctx.auth.token });

    let template = await client.getTemplateDetails(ctx.input.templateId);

    return {
      output: {
        templateId: template.templateId,
        templateName: template.templateName,
        bodyStructure: template.bodyStructure
      },
      message: `Retrieved template **${template.templateName}** (\`${template.templateId}\`).`
    };
  })
  .build();

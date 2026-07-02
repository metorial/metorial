import { SlateTool } from 'slates';
import { z } from 'zod';
import { DocuGenerateClient } from '../lib/client';
import { spec } from '../spec';

export let updateTemplate = SlateTool.create(spec, {
  name: 'Update Template',
  key: 'update_template',
  description: `Updates a template's metadata such as name, enhanced syntax, and versioning settings. Provide only the fields you want to change.`,
  instructions: [
    'At least one field (name, enhancedSyntax, or versioningEnabled) should be provided.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template to update'),
      name: z.string().optional().describe('New name for the template'),
      enhancedSyntax: z
        .boolean()
        .optional()
        .describe('Enable or disable enhanced syntax for this template'),
      versioningEnabled: z
        .boolean()
        .optional()
        .describe('Enable or disable versioning for this template')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('Updated template ID'),
      name: z.string().describe('Updated template name'),
      enhancedSyntax: z.boolean().describe('Whether enhanced syntax is enabled'),
      versioningEnabled: z.boolean().describe('Whether versioning is enabled')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DocuGenerateClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let t = await client.updateTemplate(ctx.input.templateId, {
      name: ctx.input.name,
      enhancedSyntax: ctx.input.enhancedSyntax,
      versioningEnabled: ctx.input.versioningEnabled
    });

    return {
      output: {
        templateId: t.id,
        name: t.name,
        enhancedSyntax: t.enhanced_syntax,
        versioningEnabled: t.versioning_enabled
      },
      message: `Updated template **${t.name}** (${t.id})`
    };
  })
  .build();

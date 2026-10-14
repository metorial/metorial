import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { credentialFormatSchema, projectIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getCredentialTemplate = SlateTool.create(spec, {
  name: 'Get Credential Template',
  key: 'get_credential_template',
  description:
    'Retrieve a complete credential template, including its attributes, issuer, validity, and branding. Call list_projects to discover project IDs and list_credential_templates to discover template IDs and formats.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      projectId: projectIdSchema,
      format: credentialFormatSchema.describe('Format returned by list_credential_templates'),
      credentialTemplateId: z
        .string()
        .min(1)
        .describe('Credential template ID from list_credential_templates')
    })
  )
  .output(
    z.object({
      templateId: z.string(),
      name: z.string(),
      format: z.string(),
      template: z.any().describe('Complete credential template returned by Paradym')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      projectId: ctx.input.projectId ?? ctx.config.projectId
    });
    let result = await client.getCredentialTemplate(
      ctx.input.format,
      ctx.input.credentialTemplateId
    );
    let template = result.data ?? result;
    return {
      output: {
        templateId: template.id,
        name: template.name,
        format: template.format,
        template
      },
      message: `Retrieved credential template "${template.name}".`
    };
  })
  .build();

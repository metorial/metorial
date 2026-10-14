import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { projectIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getPresentationTemplate = SlateTool.create(spec, {
  name: 'Get Presentation Template',
  key: 'get_presentation_template',
  description:
    'Retrieve a complete presentation template, including credential requests, trusted issuers, attribute constraints, and verifier settings. Call list_projects to discover project IDs and list_presentation_templates to discover template IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      projectId: projectIdSchema,
      presentationTemplateId: z
        .string()
        .min(1)
        .describe('Presentation template ID from list_presentation_templates')
    })
  )
  .output(
    z.object({
      presentationTemplateId: z.string(),
      name: z.string(),
      template: z.any().describe('Complete presentation template returned by Paradym')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      projectId: ctx.input.projectId ?? ctx.config.projectId
    });
    let result = await client.getPresentationTemplate(ctx.input.presentationTemplateId);
    let template = result.data ?? result;
    return {
      output: {
        presentationTemplateId: template.id,
        name: template.name,
        template
      },
      message: `Retrieved presentation template "${template.name}".`
    };
  })
  .build();

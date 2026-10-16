import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTemplateSettings = SlateTool.create(spec, {
  name: 'Get Template Settings',
  key: 'get_template_settings',
  description:
    'Read the verification and redemption actions or distribution restrictions of a pass template before updating them. Call list_templates to discover template IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      templateId: z.number().describe('Template ID from list_templates'),
      section: z.enum(['actions', 'restrictions']).describe('Settings section to retrieve')
    })
  )
  .output(
    z.object({
      templateId: z.number(),
      section: z.enum(['actions', 'restrictions']),
      settings: z
        .record(z.string(), z.any())
        .describe('Complete settings returned by PassSlot')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { templateId, section } = ctx.input;
    let settings =
      section === 'actions'
        ? await client.getTemplateActions(templateId)
        : await client.getTemplateRestrictions(templateId);
    return {
      output: { templateId, section, settings },
      message: `Retrieved ${section} settings for template **${templateId}**.`
    };
  })
  .build();

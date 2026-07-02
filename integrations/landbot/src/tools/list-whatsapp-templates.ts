import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlatformClient } from '../lib/client';
import { spec } from '../spec';

export let listWhatsAppTemplatesTool = SlateTool.create(spec, {
  name: 'List WhatsApp Templates',
  key: 'list_whatsapp_templates',
  description: `Retrieve available WhatsApp message templates for your account. Returns template IDs, names, languages, and statuses needed for sending templates via the API.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      templates: z
        .array(z.record(z.string(), z.any()))
        .describe('List of WhatsApp template records with IDs, names, languages, and statuses')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlatformClient(ctx.auth.token);
    let result = await client.listWhatsAppTemplates();
    let templates =
      result.results ?? result.templates ?? (Array.isArray(result) ? result : []);

    return {
      output: { templates },
      message: `Retrieved **${templates.length}** WhatsApp templates.`
    };
  });

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Msg91Client } from '../lib/client';
import { spec } from '../spec';

export let listWhatsAppTemplates = SlateTool.create(spec, {
  name: 'List WhatsApp Templates',
  key: 'list_whatsapp_templates',
  description:
    'List WhatsApp templates for an integrated number, including names and languages needed by send_whatsapp_message. Call list_whatsapp_numbers to discover registered numbers.',
  instructions: ['MSG91 returns a maximum of 500 templates through this endpoint.'],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      integratedNumber: z
        .string()
        .describe(
          'Integrated WhatsApp number. Call list_whatsapp_numbers to discover registered numbers.'
        ),
      templateName: z.string().optional().describe('Filter by template name'),
      templateStatus: z
        .enum(['approved', 'rejected', 'pending'])
        .optional()
        .describe('Filter by template approval status'),
      languageCode: z.string().optional().describe('Filter by template language'),
      page: z.number().int().min(1).optional().describe('Page number (default: 1)'),
      pageSize: z.number().int().min(1).optional().describe('Templates per page (default: 25)')
    })
  )
  .output(
    z.object({
      response: z
        .any()
        .describe('Templates, names, languages, and provider pagination metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Msg91Client({ token: ctx.auth.token });
    let response = await client.getWhatsAppTemplates(ctx.input);
    return { output: { response }, message: 'Retrieved WhatsApp templates.' };
  })
  .build();

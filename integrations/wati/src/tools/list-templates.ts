import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let templateSchema = z.object({
  templateId: z.string().optional().describe('Unique template identifier.'),
  name: z.string().optional().describe('Template name.'),
  status: z.string().optional().describe('Approval status (APPROVED, REJECTED, PENDING).'),
  category: z.string().optional().describe('Template category.'),
  language: z.string().optional().describe('Template language.'),
  qualityScore: z.string().optional().describe('Quality rating of the template.'),
  created: z.string().optional().describe('Creation timestamp.'),
  lastUpdated: z.string().optional().describe('Last update timestamp.')
});

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `Retrieve a page of WhatsApp message templates configured in your Wati account. Returns template names, statuses, categories, and languages. Use this to find template IDs for sending template messages.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      pageNumber: z
        .number()
        .min(1)
        .refine(Number.isInteger, 'Use a whole page number.')
        .default(1)
        .describe('Page number (1-based).'),
      pageSize: z
        .number()
        .min(1)
        .max(100)
        .refine(Number.isInteger, 'Use a whole page size.')
        .default(50)
        .describe('Number of templates per page (max 100).'),
      channel: z
        .string()
        .optional()
        .describe('Channel name or phone number. Omit for the default channel.')
    })
  )
  .output(
    z.object({
      templates: z.array(templateSchema).describe('List of message templates.'),
      total: z.number().optional().describe('Total templates matching the channel.'),
      pageNumber: z.number().optional().describe('Current page number.'),
      pageSize: z.number().optional().describe('Items per page.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiEndpoint: ctx.config.apiEndpoint
    });

    let result = await client.listTemplates(ctx.input);

    let templates = (result?.templates || []).map((t: any) => ({
      templateId: t.id ?? undefined,
      name: t.name ?? undefined,
      status: t.status ?? undefined,
      category: t.category ?? undefined,
      language: t.language_option?.key ?? t.language_option?.value ?? undefined,
      qualityScore: t.quality ?? undefined,
      created: t.created ?? undefined,
      lastUpdated: t.last_modified ?? undefined
    }));

    return {
      output: {
        templates,
        total: result?.total,
        pageNumber: result?.page_number,
        pageSize: result?.page_size
      },
      message: `Retrieved **${templates.length}** message templates.`
    };
  })
  .build();

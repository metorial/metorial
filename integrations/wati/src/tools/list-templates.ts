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
  description: `Retrieve all WhatsApp message templates configured in your Wati account. Returns template names, statuses, categories, and languages. Use this to find template IDs for sending template messages.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      templates: z.array(templateSchema).describe('List of message templates.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiEndpoint: ctx.config.apiEndpoint
    });

    let result = await client.listTemplates();

    let templates = (result?.template_list || []).map((t: any) => ({
      templateId: t.id,
      name: t.name,
      status: t.status,
      category: t.category,
      language: t.language,
      qualityScore: t.quality_score,
      created: t.created,
      lastUpdated: t.last_updated
    }));

    return {
      output: { templates },
      message: `Retrieved **${templates.length}** message templates.`
    };
  })
  .build();

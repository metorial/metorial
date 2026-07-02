import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let automationSchema = z.object({
  automationId: z.string().optional().describe('Unique identifier for the automation.'),
  title: z.string().optional().describe('Name of the automation.'),
  docTemplateLink: z.string().optional().describe('Link to the Google Doc template.'),
  dataSourceName: z
    .string()
    .optional()
    .describe('Data source type (e.g., "API", "Airtable", "Google Sheets").'),
  isActive: z.boolean().optional().describe('Whether the automation is currently active.'),
  saveGoogleDoc: z
    .boolean()
    .optional()
    .describe('Whether a Google Doc copy is saved on generation.'),
  dateFormat: z.string().optional().describe('Date format setting for the automation.'),
  locale: z.string().optional().describe('Locale setting for the automation.')
});

export let listAutomations = SlateTool.create(spec, {
  name: 'List Automations',
  key: 'list_automations',
  description: `Lists all automations in the DocsAutomator workspace. Returns automation details including title, template link, data source, and active status.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      automations: z.array(automationSchema).describe('List of automations in the workspace.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listAutomations();

    let automations = Array.isArray(result) ? result : result.automations || [];

    return {
      output: {
        automations: automations.map((a: any) => ({
          automationId: a._id || a.id || a.docId,
          title: a.title,
          docTemplateLink: a.docTemplateLink,
          dataSourceName: a.dataSource?.name || a.dataSourceName,
          isActive: a.isActive,
          saveGoogleDoc: a.saveGoogleDoc,
          dateFormat: a.dateFormat,
          locale: a.locale
        }))
      },
      message: `Found **${automations.length}** automation(s).`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createAutomation = SlateTool.create(spec, {
  name: 'Create Automation',
  key: 'create_automation',
  description: `Creates a new DocsAutomator automation with a title, data source, and Google Doc template link. The automation can then be used to generate documents via the Generate Document tool.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      title: z.string().describe('Name for the new automation.'),
      dataSourceName: z
        .string()
        .describe('Data source type (e.g., "API", "Airtable", "Google Sheets", "ClickUp").'),
      docTemplateLink: z.string().describe('URL to the Google Doc template to use.')
    })
  )
  .output(
    z.object({
      automationId: z.string().optional().describe('ID of the newly created automation.'),
      title: z.string().optional().describe('Title of the created automation.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createAutomation({
      title: ctx.input.title,
      dataSourceName: ctx.input.dataSourceName,
      docTemplateLink: ctx.input.docTemplateLink
    });

    return {
      output: {
        automationId: result._id || result.id || result.docId || result.automationId,
        title: result.title || ctx.input.title
      },
      message: `Created automation **${ctx.input.title}**.`
    };
  })
  .build();

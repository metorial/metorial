import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAutomation = SlateTool.create(spec, {
  name: 'Get Automation',
  key: 'get_automation',
  description: `Retrieves detailed information about a single DocsAutomator automation by its ID. Returns full configuration including template link, data source settings, output options, and more.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      automationId: z.string().describe('The automation ID to retrieve.')
    })
  )
  .output(
    z.object({
      automationId: z.string().optional().describe('Unique identifier for the automation.'),
      title: z.string().optional().describe('Name of the automation.'),
      docTemplateLink: z.string().optional().describe('Link to the Google Doc template.'),
      dataSourceName: z.string().optional().describe('Data source type.'),
      isActive: z.boolean().optional().describe('Whether the automation is currently active.'),
      saveGoogleDoc: z.boolean().optional().describe('Whether a Google Doc copy is saved.'),
      dateFormat: z.string().optional().describe('Date format setting.'),
      locale: z.string().optional().describe('Locale setting.'),
      newDocumentNameField: z
        .string()
        .optional()
        .describe('Field used to name generated documents.'),
      overwriteAttachment: z
        .boolean()
        .optional()
        .describe('Whether to overwrite existing attachments.'),
      googleDocDestinationFolderUrl: z
        .string()
        .optional()
        .describe('Destination folder URL for Google Docs.'),
      formatNumbersWithLocale: z
        .boolean()
        .optional()
        .describe('Whether numbers are formatted with locale settings.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getAutomation(ctx.input.automationId);

    return {
      output: {
        automationId: result._id || result.id || result.docId,
        title: result.title,
        docTemplateLink: result.docTemplateLink,
        dataSourceName: result.dataSource?.name || result.dataSourceName,
        isActive: result.isActive,
        saveGoogleDoc: result.saveGoogleDoc,
        dateFormat: result.dateFormat,
        locale: result.locale,
        newDocumentNameField: result.newDocumentNameField,
        overwriteAttachment: result.overwriteAttachment,
        googleDocDestinationFolderUrl: result.googleDocDestinationFolderUrl,
        formatNumbersWithLocale: result.formatNumbersWithLocale
      },
      message: `Retrieved automation **${result.title || ctx.input.automationId}**.`
    };
  })
  .build();

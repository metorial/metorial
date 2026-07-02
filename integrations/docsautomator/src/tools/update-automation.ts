import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateAutomation = SlateTool.create(spec, {
  name: 'Update Automation',
  key: 'update_automation',
  description: `Updates an existing DocsAutomator automation's settings. Only the specified fields are updated; unspecified fields remain unchanged.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      automationId: z.string().describe('The automation ID to update.'),
      title: z.string().optional().describe('New title for the automation.'),
      docTemplateLink: z.string().optional().describe('New Google Doc template URL.'),
      isActive: z.boolean().optional().describe('Set the automation active or inactive.'),
      saveGoogleDoc: z
        .boolean()
        .optional()
        .describe('Whether to save a Google Doc version on generation.'),
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
        .describe('Whether to format numbers with locale settings.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update was successful.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let { automationId, ...updateFields } = ctx.input;

    // Filter out undefined values
    let params: Record<string, unknown> = {};
    for (let [key, value] of Object.entries(updateFields)) {
      if (value !== undefined) {
        params[key] = value;
      }
    }

    await client.updateAutomation(automationId, params);

    return {
      output: {
        success: true
      },
      message: `Updated automation **${automationId}**.`
    };
  })
  .build();

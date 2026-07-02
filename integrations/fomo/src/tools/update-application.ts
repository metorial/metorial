import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateApplication = SlateTool.create(spec, {
  name: 'Update Application Settings',
  key: 'update_application',
  description: `Update Fomo application settings that control how notifications are displayed to visitors on your website, including position, timing, theme, and UTM tracking parameters.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      applicationId: z.number().describe('Unique ID of the Fomo application to update.'),
      name: z.string().optional().describe('Application name (max 255 chars).'),
      url: z.string().optional().describe('Application URL (max 255 chars).'),
      language: z.string().optional().describe('ISO-2 language code (e.g., "en").'),
      pageLoad: z
        .number()
        .optional()
        .describe('Delay in seconds before widget first appears after page load.'),
      maximumPerPage: z
        .string()
        .optional()
        .describe('Maximum notifications per page load (default: "30").'),
      displayFor: z
        .number()
        .optional()
        .describe('How long each notification is displayed in seconds.'),
      displayInterval: z
        .number()
        .optional()
        .describe('Delay in seconds between consecutive notifications.'),
      randomize: z
        .boolean()
        .optional()
        .describe('Whether to show notifications in random order.'),
      closable: z.boolean().optional().describe('Whether visitors can close the widget.'),
      position: z
        .enum(['bottom_left', 'bottom_right', 'top_left', 'top_right'])
        .optional()
        .describe('Widget position on the page.'),
      theme: z
        .string()
        .optional()
        .describe('Widget theme (e.g., "theme1", "theme2", "custom").'),
      utmSource: z
        .string()
        .optional()
        .describe('UTM source for Google Analytics tracking (default: "fomo").'),
      utmMedium: z.string().optional().describe('UTM medium for Google Analytics tracking.')
    })
  )
  .output(
    z.object({
      updated: z.boolean().describe('Whether the update was successful.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let { applicationId, ...settings } = ctx.input;
    await client.updateApplication(applicationId, settings);

    return {
      output: { updated: true },
      message: `Updated application **#${applicationId}** settings.`
    };
  })
  .build();

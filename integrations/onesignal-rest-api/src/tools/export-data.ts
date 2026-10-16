import { createApiServiceError, getFileUrlTool, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { appIdSchema } from '../lib/schemas';
import { spec } from '../spec';

let exportReferenceSchema = z.object({
  appId: z.string(),
  segmentName: z.string().optional(),
  lastActiveSince: z.string().optional(),
  extraFields: z.array(z.string()).optional(),
  includeUnsubscribed: z.boolean().optional()
});

export let exportData = SlateTool.create(spec, {
  name: 'Export Data',
  key: 'export_data',
  description: `Export user and subscription data as a CSV file. Returns a URL to download the gzip-compressed CSV. The file may take some time to generate and is available for 3 days. Provide appId from list_apps with an Organization API Key, or Settings > Keys & IDs.`,
  instructions: [
    'An expired download creates a fresh export with the same filters and current data. Wait for generation to complete before downloading.'
  ],
  constraints: [
    'Only one export can run per account at a time.',
    'Processing speed is approximately 2,000 records per second.',
    'The returned URL may return 404 until generation completes — poll until available.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      appId: appIdSchema,
      includeUnsubscribed: z
        .boolean()
        .optional()
        .describe('Include unsubscribed subscriptions when exporting a segment'),
      segmentName: z.string().optional().describe('Filter export to a specific segment name'),
      lastActiveSince: z
        .string()
        .optional()
        .describe('Unix timestamp — only include users active since this time'),
      extraFields: z
        .array(
          z.enum([
            'external_user_id',
            'onesignal_id',
            'location',
            'country',
            'rooted',
            'ip',
            'web_auth',
            'web_p256',
            'unsubscribed_at',
            'notification_types',
            'timezone_id'
          ])
        )
        .optional()
        .describe('Additional fields to include in the export')
    })
  )
  .output(
    z.object({
      csvFileUrl: z
        .string()
        .optional()
        .describe('URL to download the gzip-compressed CSV file')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      appId: ctx.input.appId ?? ctx.config.appId
    });

    let result = await client.exportCsv({
      segmentName: ctx.input.segmentName,
      lastActiveSince: ctx.input.lastActiveSince,
      extraFields: ctx.input.extraFields,
      includeUnsubscribed: ctx.input.includeUnsubscribed
    });

    if (result.csv_file_url) {
      await ctx.addAttachment({
        type: 'url',
        url: result.csv_file_url,
        mimeType: 'application/gzip',
        refreshReference: { ...ctx.input, appId: client.appId },
        refreshAt: new Date(Date.now() + 71 * 60 * 60 * 1000).toISOString()
      });
    }

    return {
      output: {
        csvFileUrl: result.csv_file_url
      },
      message: result.csv_file_url
        ? `Export started. Download URL: ${result.csv_file_url}`
        : 'Export request submitted. The file URL was not returned yet.'
    };
  })
  .build();

export let getExportFileUrl = getFileUrlTool(spec, async ctx => {
  let reference = exportReferenceSchema.safeParse(ctx.input.reference);
  if (!reference.success)
    throw createApiServiceError('Invalid export reference. Request a new export.');
  let client = new Client({ token: ctx.auth.token, appId: reference.data.appId });
  let result = await client.exportCsv(reference.data);
  if (!result.csv_file_url)
    throw createApiServiceError(
      'OneSignal did not return an export URL. Request a new export.'
    );
  return {
    url: result.csv_file_url,
    expiresAt: new Date(Date.now() + 71 * 60 * 60 * 1000).toISOString()
  };
});

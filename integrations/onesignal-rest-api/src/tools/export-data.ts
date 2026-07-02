import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let exportData = SlateTool.create(spec, {
  name: 'Export Data',
  key: 'export_data',
  description: `Export user and subscription data as a CSV file. Returns a URL to download the gzip-compressed CSV. The file may take some time to generate and is available for 3 days.`,
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
      appId: ctx.config.appId
    });

    let result = await client.exportCsv({
      segmentName: ctx.input.segmentName,
      lastActiveSince: ctx.input.lastActiveSince,
      extraFields: ctx.input.extraFields
    });

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

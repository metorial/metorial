import { SlateTool } from 'slates';
import { z } from 'zod';
import { AbyssaleClient } from '../lib/client';
import { spec } from '../spec';

export let exportBanners = SlateTool.create(spec, {
  name: 'Export Banners',
  key: 'export_banners',
  description: `Export one or more previously generated banners as a downloadable ZIP file. This is an asynchronous operation — a callback URL is required to receive a notification with the download link when the export is ready.`,
  constraints: [
    'Requires a callback URL to deliver the export result.',
    'Banner IDs must be valid UUIDs of previously generated banners.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      bannerIds: z
        .array(z.string())
        .describe('Array of banner UUIDs to include in the export'),
      callbackUrl: z
        .string()
        .describe('Webhook URL to receive the NEW_EXPORT event when the ZIP file is ready')
    })
  )
  .output(
    z.object({
      exportId: z.string().describe('ID of the export request')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AbyssaleClient({ token: ctx.auth.token });

    let result = await client.exportBanners({
      bannerIds: ctx.input.bannerIds,
      callbackUrl: ctx.input.callbackUrl
    });

    return {
      output: {
        exportId: result.export_id
      },
      message: `Export started for **${ctx.input.bannerIds.length}** banner(s). Export ID: \`${result.export_id}\`. The ZIP download link will be delivered to the callback URL.`
    };
  })
  .build();

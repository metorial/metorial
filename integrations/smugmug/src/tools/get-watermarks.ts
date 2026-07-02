import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getWatermarksTool = SlateTool.create(spec, {
  name: 'Get Watermarks',
  key: 'get_watermarks',
  description: `List all watermark images configured for a SmugMug user. Watermarks can be applied to albums to protect photos from unauthorized use. Returns watermark name, URI, and settings.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      nickname: z.string().describe('SmugMug user nickname')
    })
  )
  .output(
    z.object({
      watermarks: z
        .array(
          z.object({
            name: z.string().optional().describe('Watermark name'),
            uri: z
              .string()
              .optional()
              .describe('Watermark API URI (use this to apply to albums)'),
            dissolve: z.number().optional().describe('Transparency level'),
            pinned: z.string().optional().describe('Position of the watermark'),
            thumbs: z.boolean().optional().describe('Whether to apply to thumbnails')
          })
        )
        .describe('List of watermarks'),
      totalWatermarks: z.number().describe('Total number of watermarks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      tokenSecret: ctx.auth.tokenSecret,
      consumerKey: ctx.auth.consumerKey,
      consumerSecret: ctx.auth.consumerSecret
    });

    let watermarks = await client.getUserWatermarks(ctx.input.nickname);

    let mapped = watermarks.map((wm: any) => ({
      name: wm.Name || undefined,
      uri: wm.Uri || undefined,
      dissolve: wm.Dissolve || undefined,
      pinned: wm.Pinned || undefined,
      thumbs: wm.Thumbs || undefined
    }));

    return {
      output: {
        watermarks: mapped,
        totalWatermarks: mapped.length
      },
      message: `Found **${mapped.length}** watermark(s) for user **${ctx.input.nickname}**`
    };
  })
  .build();

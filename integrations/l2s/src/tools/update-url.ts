import { SlateTool } from 'slates';
import { z } from 'zod';
import { L2sClient } from '../lib/client';
import { spec } from '../spec';

export let updateUrl = SlateTool.create(spec, {
  name: 'Update URL',
  key: 'update_url',
  description: `Update an existing shortened URL's destination, UTM parameters, or tags. Only provided fields will be updated; omitted fields remain unchanged.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      urlId: z.string().describe('The ID of the shortened URL to update'),
      url: z.string().optional().describe('New destination URL'),
      tags: z.array(z.string()).optional().describe('Updated tags for the shortened URL'),
      utmSource: z.string().optional().describe('Updated UTM source parameter'),
      utmMedium: z.string().optional().describe('Updated UTM medium parameter'),
      utmCampaign: z.string().optional().describe('Updated UTM campaign parameter'),
      utmTerm: z.string().optional().describe('Updated UTM term parameter'),
      utmContent: z.string().optional().describe('Updated UTM content parameter')
    })
  )
  .output(
    z.object({
      ok: z.boolean().describe('Whether the operation was successful'),
      message: z.string().describe('Status message from the API'),
      urlData: z.any().describe('Updated shortened URL data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new L2sClient({ token: ctx.auth.token });

    let updateParams: Record<string, any> = {};
    if (ctx.input.url !== undefined) updateParams.url = ctx.input.url;
    if (ctx.input.tags !== undefined) updateParams.tags = ctx.input.tags;
    if (ctx.input.utmSource !== undefined) updateParams.utmSource = ctx.input.utmSource;
    if (ctx.input.utmMedium !== undefined) updateParams.utmMedium = ctx.input.utmMedium;
    if (ctx.input.utmCampaign !== undefined) updateParams.utmCampaign = ctx.input.utmCampaign;
    if (ctx.input.utmTerm !== undefined) updateParams.utmTerm = ctx.input.utmTerm;
    if (ctx.input.utmContent !== undefined) updateParams.utmContent = ctx.input.utmContent;

    let result = await client.updateUrl(ctx.input.urlId, updateParams);

    return {
      output: {
        ok: result.ok,
        message: result.response?.message ?? 'URL updated',
        urlData: result.response?.data
      },
      message: `Updated shortened URL **${ctx.input.urlId}**.`
    };
  })
  .build();

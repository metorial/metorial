import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { parseResponse } from '../lib/responses';
import { spec } from '../spec';

let responseSchema = z
  .object({
    html: z.string().describe('Embeddable HTML supplied by the provider'),
    type: z.string().optional(),
    version: z.string().optional(),
    provider_name: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    source: z.string().optional().describe('Native provider, discovery, or hosted fallback'),
    embed_id: z.string().optional(),
    frame_url: z.string().optional()
  })
  .passthrough();

export let getOembed = SlateTool.create(spec, {
  key: 'get_oembed',
  name: 'Get Embeddable Content',
  description:
    'Get an oEmbed representation of a URL, including embeddable HTML, dimensions, and provider metadata. Uses a native provider embed when available and a hosted preview card otherwise.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      url: z.string().describe('URL of the page or media to embed'),
      orientation: z
        .enum(['vertical', 'horizontal'])
        .optional()
        .describe('Fallback card orientation'),
      alwaysOgFrame: z.boolean().optional().describe('Always generate a hosted preview card'),
      maxWidth: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Maximum embed width in pixels'),
      maxHeight: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Maximum embed height in pixels'),
      theme: z
        .enum(['light', 'dark', 'auto'])
        .optional()
        .describe('Fallback card color theme'),
      template: z
        .enum(['default', 'compact', 'horizontal'])
        .optional()
        .describe('Fallback card layout; overrides orientation'),
      cacheOk: z
        .boolean()
        .optional()
        .describe('Allow cached page metadata. Defaults to true.'),
      maxCacheAge: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Maximum cache age in milliseconds. Defaults to 432000000.'),
      fullRender: z
        .boolean()
        .optional()
        .describe('Render JavaScript when building a fallback card'),
      useProxy: z.boolean().optional().describe('Use a standard proxy for fallback metadata'),
      usePremium: z
        .boolean()
        .optional()
        .describe('Use a residential proxy when supported by the plan'),
      useSuperior: z
        .boolean()
        .optional()
        .describe('Use a mobile proxy when supported by the plan'),
      proxyCountry: z.string().optional().describe('Country code for proxy routing')
    })
  )
  .output(responseSchema)
  .handleInvocation(async ctx => {
    let { url, ...options } = ctx.input;
    let result = await new Client(ctx.auth).getOembed(url, options);
    return {
      output: parseResponse(result, responseSchema),
      message: `Retrieved embeddable content for \`${url}\`.`
    };
  })
  .build();

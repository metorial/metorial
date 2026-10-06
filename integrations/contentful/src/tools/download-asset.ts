import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { invalid, malformed, resourceId, selection } from '../lib/schemas';
import { spec } from '../spec';
export let downloadAsset = SlateTool.create(spec, {
  name: 'Download Asset',
  key: 'download_asset',
  description:
    'Download the processed original file for an exact asset ID and locale. Discover available locales with get_asset. Secure or embargoed files require a separately configured delivery workflow.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      ...selection,
      api: z.enum(['management', 'delivery', 'preview']).optional(),
      assetId: resourceId,
      locale: resourceId.describe(
        'Exact file locale from get_asset; no locale fallback is selected.'
      )
    })
  )
  .output(
    z.object({
      assetId: z.string(),
      locale: z.string(),
      fileName: z.string(),
      contentType: z.string().optional(),
      size: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth, ctx.input);
    let asset = await client.getAsset(ctx.input.assetId);
    let file = asset.fields?.file?.[ctx.input.locale];
    if (!file || typeof file.url !== 'string' || typeof file.fileName !== 'string')
      throw invalid(
        'The exact locale has no processed file. Inspect get_asset and finish processing first.'
      );
    let url: URL;
    try {
      url = new URL(file.url.startsWith('//') ? `https:${file.url}` : file.url);
    } catch {
      throw malformed();
    }
    let hosts = new Set([
      'images.ctfassets.net',
      'assets.ctfassets.net',
      'downloads.ctfassets.net',
      'videos.ctfassets.net',
      'images.eu.ctfassets.net',
      'assets.eu.ctfassets.net',
      'downloads.eu.ctfassets.net',
      'videos.eu.ctfassets.net'
    ]);
    let segments = url.pathname.split('/').filter(Boolean);
    if (
      !hosts.has(url.hostname) ||
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.port ||
      url.search ||
      url.hash ||
      segments[0] !== client.spaceId ||
      segments[1] !== ctx.input.assetId ||
      segments.length !== 4
    )
      throw invalid(
        'The returned file URL is not a supported public original for this exact space and asset. Secure or embargoed delivery needs a separately configured asset-key workflow.'
      );
    await ctx.addAttachment({
      type: 'url',
      url: url.href,
      filename: file.fileName,
      mimeType: typeof file.contentType === 'string' ? file.contentType : undefined
    });
    return {
      output: {
        assetId: asset.sys.id,
        locale: ctx.input.locale,
        fileName: file.fileName,
        contentType: file.contentType,
        size: file.details?.size
      },
      message: 'The original asset file is available to download.'
    };
  })
  .build();

import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { ImgixClient } from '../lib/client';
import { containsCredential } from '../lib/errors';
import {
  expiry,
  renderParams,
  renderUrl,
  sourceDomain,
  sourceSigningToken
} from '../lib/render';
import { originPath, sourceId } from '../lib/schemas';
import { spec } from '../spec';
export const downloadAsset = SlateTool.create(spec, {
  name: 'Download Asset',
  key: 'download_asset',
  description:
    'Provide a downloadable rendered file for an existing asset in an authorized source. Uses only a domain currently assigned to that source. Rendering and delivery can consume credits when the file is downloaded.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      sourceId,
      originPath,
      domain: z
        .string()
        .optional()
        .describe(
          'Optional currently assigned source domain; otherwise the first assigned domain is used.'
        ),
      params: renderParams
        .optional()
        .describe(
          'Optional rendering parameters; values are unencoded, including parameters ending in 64.'
        ),
      expiresAt: expiry
    })
  )
  .output(
    z.object({
      sourceId: z.string(),
      assetId: z.string(),
      originPath: z.string(),
      renderUrl: z.string(),
      expiresAt: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.params?.s !== undefined || ctx.input.params?.expires !== undefined)
      throw createApiServiceError(
        'Use expiresAt for file delivery and omit precomputed s; the current source signing token is used.',
        { parent: {} }
      );
    const client = new ImgixClient(ctx.auth.token),
      source = (await client.getSource(ctx.input.sourceId)).data;
    if (!source.attributes.enabled || source.attributes.deployment_status !== 'deployed')
      throw createApiServiceError(
        'The source must be explicitly enabled and deployed before file delivery.',
        { parent: {} }
      );
    if (source.attributes.deployment?.type === 'webproxy')
      throw createApiServiceError(
        'This file tool does not fetch arbitrary Web Proxy origins. Use the URL-building tools for that source.',
        { parent: {} }
      );
    const asset = (await client.getAsset(ctx.input.sourceId, ctx.input.originPath)).data;
    const domain = sourceDomain(source, ctx.input.domain),
      token = sourceSigningToken(source),
      params = ctx.input.params ?? {};
    if (ctx.input.expiresAt !== undefined && !token)
      throw createApiServiceError(
        'Expiring file delivery requires a secured source so the expiry cannot be modified.',
        { parent: {} }
      );
    const url = renderUrl(
      domain,
      asset.attributes.origin_path,
      params,
      token,
      ctx.input.expiresAt
    );
    if (
      containsCredential(url, ctx.auth.token) ||
      (token !== undefined && containsCredential(url, token))
    )
      throw createApiServiceError(
        'The resulting URL reflects a credential; change the path or parameters.',
        { parent: {} }
      );
    const validForSeconds =
      ctx.input.expiresAt === undefined
        ? undefined
        : ctx.input.expiresAt - Math.floor(Date.now() / 1000);
    if (validForSeconds !== undefined && validForSeconds <= 0)
      throw createApiServiceError(
        'The file URL expired before delivery. Use a later expiresAt.',
        { parent: {} }
      );
    await ctx.addAttachment({
      type: 'url',
      url,
      ...(ctx.input.expiresAt === undefined
        ? {}
        : {
            refreshAt: new Date(ctx.input.expiresAt * 1000).toISOString(),
            refreshReference: {
              sourceId: source.id,
              originPath: asset.attributes.origin_path,
              domain,
              params,
              validForSeconds,
              accountId: source.relationships?.account.data.id
            }
          })
    });
    return {
      output: {
        sourceId: source.id,
        assetId: asset.id,
        originPath: asset.attributes.origin_path,
        renderUrl: url,
        expiresAt: ctx.input.expiresAt
      },
      message:
        'The existing asset is available as a downloadable rendered file. Rendering and delivery charges may apply when it is downloaded.'
    };
  })
  .build();

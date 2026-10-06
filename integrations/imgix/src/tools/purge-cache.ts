import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { ImgixClient } from '../lib/client';
import { sourceId } from '../lib/schemas';
import { publicUrl } from '../lib/validation';
import { spec } from '../spec';
export const purgeCache = SlateTool.create(spec, {
  name: 'Purge Cache',
  key: 'purge_cache',
  description:
    'Request a purge of a URL associated with the current imgix account. Removes cached derivatives, so later rendering may re-fetch origin and incur charges. Sub-image purge cascades to parent images. It does not delete origin data or retained history.',
  constraints: [
    'Duplicate requests within 10 seconds can return HTTP 409; do not automatically repeat a purge.'
  ],
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      url: z
        .string()
        .describe(
          'Exact absolute URL belonging to the account. Percent-encode spaces; ordinary asset purge needs no transformation parameters.'
        ),
      subImage: z.boolean().optional(),
      sourceId: sourceId
        .optional()
        .describe(
          'Required for sub-image purge; discover the parent source with list_sources.'
        )
    })
  )
  .output(z.object({ purgeId: z.string() }))
  .handleInvocation(async ctx => {
    const parsed = publicUrl(ctx.input.url);
    if (parsed.protocol !== 'https:')
      throw createApiServiceError('Use an HTTPS imgix asset URL for purge.', { parent: {} });
    if (ctx.input.subImage && !ctx.input.sourceId)
      throw createApiServiceError('sourceId is required for a sub-image purge.', {
        parent: {}
      });
    if (
      ctx.input.subImage &&
      !parsed.searchParams.has('mark') &&
      !parsed.searchParams.has('blend')
    )
      throw createApiServiceError(
        'A sub-image purge URL must contain the documented mark or blend parameter.',
        { parent: {} }
      );
    if (/\s/.test(ctx.input.url))
      throw createApiServiceError('Percent-encode spaces in the exact purge URL.', {
        parent: {}
      });
    const result = await new ImgixClient(ctx.auth.token).purge(ctx.input.url, ctx.input);
    return {
      output: { purgeId: result.data.id },
      message: `Purge request ${result.data.id} was accepted. Origin data, usage history, and client caches may remain.`
    };
  })
  .build();

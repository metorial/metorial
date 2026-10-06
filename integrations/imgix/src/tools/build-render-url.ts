import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { containsCredential } from '../lib/errors';
import { renderParams, renderUrl } from '../lib/render';
import { spec } from '../spec';
export const buildRenderUrl = SlateTool.create(spec, {
  name: 'Build Render URL',
  key: 'build_render_url',
  description:
    'Build an HTTPS imgix rendering URL locally without requesting the image. Parameters and paths are encoded; parameters ending in 64 receive UTF-8 base64url encoding. Serving the resulting URL can trigger rendering and delivery charges.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      domain: z.string(),
      path: z
        .string()
        .describe(
          'Unencoded source path, or a full origin URL for a Web Proxy source; Web Proxy serving requires signing.'
        ),
      params: renderParams.optional()
    })
  )
  .output(z.object({ renderUrl: z.string() }))
  .handleInvocation(async ctx => {
    const url = renderUrl(ctx.input.domain, ctx.input.path, ctx.input.params);
    if (containsCredential(url, ctx.auth.token))
      throw createApiServiceError(
        'The URL reflects the Management API key. Remove it from the path or parameters.',
        { parent: {} }
      );
    return {
      output: { renderUrl: url },
      message: 'Built the rendering URL locally; no image request was made.'
    };
  })
  .build();

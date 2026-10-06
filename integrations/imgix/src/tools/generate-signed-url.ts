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
import { sourceId } from '../lib/schemas';
import { spec } from '../spec';
export const generateSignedUrl = SlateTool.create(spec, {
  name: 'Generate Signed URL',
  key: 'generate_signed_url',
  description:
    'Build a correctly signed HTTPS imgix URL without requesting the image. Prefer sourceId from list_sources to use its current signing token internally. Existing manual secureUrlToken calls remain supported. Serving the URL may incur rendering and delivery charges.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      domain: z
        .string()
        .optional()
        .describe(
          'Source domain. Required for legacy manual signing; with sourceId it must be currently assigned to that source.'
        ),
      path: z.string().min(1),
      secureUrlToken: z
        .string()
        .optional()
        .describe(
          'Legacy manual source signing token. Omit when using sourceId; tokens are never returned by source tools.'
        ),
      sourceId: sourceId.optional(),
      params: renderParams.optional(),
      expiresAt: expiry
    })
  )
  .output(z.object({ signedUrl: z.string(), expiresAt: z.number().optional() }))
  .handleInvocation(async ctx => {
    let domain = ctx.input.domain,
      token = ctx.input.secureUrlToken;
    if (ctx.input.sourceId !== undefined) {
      if (token !== undefined)
        throw createApiServiceError('Use sourceId or a manual secureUrlToken, not both.', {
          parent: {}
        });
      const source = (await new ImgixClient(ctx.auth.token).getSource(ctx.input.sourceId))
        .data;
      domain = sourceDomain(source, domain);
      token = sourceSigningToken(source);
    }
    if (!domain || !token)
      throw createApiServiceError(
        'Use an authorized secured sourceId, or provide domain and its manual secureUrlToken.',
        { parent: {} }
      );
    const url = renderUrl(
      domain,
      ctx.input.path,
      ctx.input.params,
      token,
      ctx.input.expiresAt
    );
    if (containsCredential(url, ctx.auth.token) || containsCredential(url, token))
      throw createApiServiceError(
        'The URL reflects a credential. Remove it from the path or parameters.',
        { parent: {} }
      );
    return {
      output: {
        signedUrl: url,
        expiresAt:
          ctx.input.expiresAt ??
          (ctx.input.params?.expires === undefined
            ? undefined
            : Number(ctx.input.params.expires))
      },
      message: 'Built the signed URL locally; no image request was made.'
    };
  })
  .build();

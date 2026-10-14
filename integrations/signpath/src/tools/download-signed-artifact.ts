import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createSignPathClient } from '../lib/client';
import { spec } from '../spec';

export let downloadSignedArtifact = SlateTool.create(spec, {
  name: 'Download Signed Artifact',
  key: 'download_signed_artifact',
  description:
    'Prepare the signed artifact from a completed signing request for download. The authenticated user must have permission to access the request.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      signingRequestId: z.string().min(1).describe('ID of the completed signing request')
    })
  )
  .output(z.object({ signingRequestId: z.string(), status: z.string() }))
  .handleInvocation(async ctx => {
    let client = createSignPathClient(ctx);
    let request = await client.getSigningRequest(ctx.input.signingRequestId);
    if (request.status !== 'Completed') {
      throw createApiServiceError(
        `The signed artifact is not available while the request is ${request.status}. Check get_signing_request_status before retrying.`
      );
    }
    let { downloadUrl } = await client.downloadSignedArtifact(ctx.input.signingRequestId);
    await ctx.addAttachment({
      type: 'url',
      url: downloadUrl,
      headers: { Authorization: `Bearer ${ctx.auth.token}` }
    });
    return {
      output: { signingRequestId: ctx.input.signingRequestId, status: request.status },
      message: `Prepared the signed artifact for request **${ctx.input.signingRequestId}** for download.`
    };
  })
  .build();

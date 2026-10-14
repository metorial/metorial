import { SlateTool } from 'slates';
import { z } from 'zod';
import { IgnisignClient } from '../lib/client';
import { spec } from '../spec';

export let getSignatureRequestsStatus = SlateTool.create(spec, {
  name: 'Get Signature Requests Status',
  key: 'get_signature_requests_status',
  description: 'Check the current signing status of multiple signature requests in one call.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      signatureRequestIds: z
        .array(z.string().min(1))
        .min(1)
        .describe('Request IDs from create_signature_request or list_signature_requests')
    })
  )
  .output(
    z.object({
      signatureRequests: z.array(
        z.object({ signatureRequestId: z.string(), status: z.string() })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new IgnisignClient({
      token: ctx.auth.token,
      appId: ctx.auth.appId ?? ctx.config.appId,
      appEnv: ctx.auth.appEnv ?? ctx.config.appEnv
    });
    let result = await client.getSignatureRequestsStatus(ctx.input.signatureRequestIds);
    return {
      output: { signatureRequests: result.signatureRequests },
      message: `Retrieved status for ${result.signatureRequests.length} signature request(s).`
    };
  })
  .build();

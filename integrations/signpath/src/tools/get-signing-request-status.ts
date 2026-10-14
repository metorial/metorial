import { SlateTool } from 'slates';
import { z } from 'zod';
import { createSignPathClient } from '../lib/client';
import { spec } from '../spec';

export let getSigningRequestStatus = SlateTool.create(spec, {
  name: 'Get Signing Request Status',
  key: 'get_signing_request_status',
  description:
    'Poll signing progress using the status endpoint. Returns the current status, workflow stage, and whether processing has finished.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      signingRequestId: z
        .string()
        .min(1)
        .describe('Signing request ID returned when the request was submitted')
    })
  )
  .output(
    z.object({
      signingRequestId: z.string(),
      status: z.string(),
      workflowStatus: z.string(),
      isFinalStatus: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let status = await createSignPathClient(ctx).getSigningRequestStatus(
      ctx.input.signingRequestId
    );
    return {
      output: status,
      message: `Signing request **${status.signingRequestId}** is **${status.status}** (${status.workflowStatus}).`
    };
  })
  .build();

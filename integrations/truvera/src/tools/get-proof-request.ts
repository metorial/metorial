import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getProofRequest = SlateTool.create(spec, {
  name: 'Get Proof Request',
  key: 'get_proof_request',
  description: `Retrieve the status and details of a proof request. Shows whether the proof has been submitted, verified, or is still pending. When verified, includes the submitted presentation with verified attributes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      proofRequestId: z.string().describe('ID of the proof request to retrieve')
    })
  )
  .output(
    z.object({
      proofRequestId: z.string().describe('Proof request ID'),
      requestName: z.string().optional().describe('Name of the proof request'),
      verified: z.boolean().optional().describe('Whether the proof was verified successfully'),
      expired: z.boolean().optional().describe('Whether the proof request has expired'),
      presentation: z
        .any()
        .optional()
        .describe('The submitted verifiable presentation (if verified)'),
      proofRequest: z.any().describe('Full proof request details')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.getProofRequest(ctx.input.proofRequestId);

    let status =
      result?.verified === true ? 'verified' : result?.expired ? 'expired' : 'pending';

    return {
      output: {
        proofRequestId: result?.id || ctx.input.proofRequestId,
        requestName: result?.name,
        verified: result?.verified,
        expired: result?.expired,
        presentation: result?.presentation,
        proofRequest: result
      },
      message: `Proof request **${ctx.input.proofRequestId}** status: **${status}**.`
    };
  })
  .build();

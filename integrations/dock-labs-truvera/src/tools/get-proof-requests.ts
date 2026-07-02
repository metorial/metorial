import { SlateTool } from 'slates';
import { z } from 'zod';
import { DockClient } from '../lib/client';
import { spec } from '../spec';

export let getProofRequests = SlateTool.create(spec, {
  name: 'Get Proof Requests',
  key: 'get_proof_requests',
  description: `Retrieve a specific proof request by ID or list all proof requests. Use this to check the status of submitted proofs and retrieve proof details.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      proofRequestId: z
        .string()
        .optional()
        .describe('Proof request ID to retrieve. Omit to list all proof requests'),
      offset: z.number().optional().describe('Pagination offset for listing'),
      limit: z.number().optional().describe('Maximum number of results for listing')
    })
  )
  .output(
    z.object({
      proofRequest: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('The proof request document with submission status'),
      proofRequests: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of proof requests')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DockClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    if (ctx.input.proofRequestId) {
      let result = await client.getProofRequest(ctx.input.proofRequestId);
      return {
        output: { proofRequest: result },
        message: `Retrieved proof request **${ctx.input.proofRequestId}**`
      };
    }

    let results = await client.listProofRequests({
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });
    return {
      output: { proofRequests: results },
      message: `Found **${results.length}** proof request(s)`
    };
  })
  .build();

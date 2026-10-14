import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listProofRequests = SlateTool.create(spec, {
  name: 'List Proof Requests',
  key: 'list_proof_requests',
  description:
    'List proof requests with IDs, verification status, expiry status, and holder response URLs. Use get_proof_request to inspect a request and its submitted presentation.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      offset: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('Number of items to skip for pagination'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(64)
        .optional()
        .describe('Maximum number of items to return (max 64)')
    })
  )
  .output(
    z.object({
      proofRequests: z.array(
        z.object({
          proofRequestId: z.string().describe('Proof request ID'),
          requestName: z.string().optional().describe('Proof request name'),
          verified: z
            .boolean()
            .optional()
            .describe('Whether the submitted proof was verified'),
          expired: z.boolean().optional().describe('Whether the request has expired'),
          responseUrl: z.string().optional().describe('URL to submit a presentation'),
          qrCode: z.string().optional().describe('Mobile wallet deep link'),
          createdAt: z.string().optional().describe('Creation timestamp')
        })
      ),
      total: z
        .number()
        .optional()
        .describe('Total number of requests, when provided by the API')
    })
  )
  .handleInvocation(async ctx => {
    let result = await createClient(ctx).listProofRequests(ctx.input);
    let list = Array.isArray(result) ? result : (result?.list ?? []);
    let proofRequests = list.map((request: any) => ({
      proofRequestId: request.id,
      requestName: request.name ?? undefined,
      verified: request.verified ?? undefined,
      expired: request.expired ?? undefined,
      responseUrl: request.response_url ?? undefined,
      qrCode: request.qr ?? undefined,
      createdAt: request.created ?? undefined
    }));
    return {
      output: { proofRequests, total: result?.total ?? undefined },
      message: `Found **${proofRequests.length}** proof request(s).`
    };
  })
  .build();

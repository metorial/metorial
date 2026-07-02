import { SlateTool } from 'slates';
import { z } from 'zod';
import { IgnisignClient } from '../lib/client';
import { spec } from '../spec';

export let listSignatureRequests = SlateTool.create(spec, {
  name: 'List Signature Requests',
  key: 'list_signature_requests',
  description: `Retrieve a paginated list of signature requests for the configured application and environment.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (0-based)')
    })
  )
  .output(
    z.object({
      signatureRequests: z.array(z.any()).describe('List of signature requests'),
      totalCount: z.number().optional().describe('Total number of signature requests'),
      currentPage: z.number().optional().describe('Current page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new IgnisignClient({
      token: ctx.auth.token,
      appId: ctx.config.appId,
      appEnv: ctx.config.appEnv
    });

    let result = await client.listSignatureRequests(ctx.input.page);

    let requests = Array.isArray(result)
      ? result
      : result.signatureRequests || result.items || [];
    let totalCount = result.total || result.totalCount;

    return {
      output: {
        signatureRequests: requests,
        totalCount,
        currentPage: ctx.input.page || 0
      },
      message: `Found **${requests.length}** signature request(s)${totalCount ? ` out of ${totalCount} total` : ''}.`
    };
  })
  .build();

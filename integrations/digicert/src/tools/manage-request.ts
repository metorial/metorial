import { SlateTool } from 'slates';
import { z } from 'zod';
import { CertCentralClient } from '../lib/client';
import { spec } from '../spec';

export let manageRequest = SlateTool.create(spec, {
  name: 'Manage Request',
  key: 'manage_request',
  description: `List, view, approve, or reject certificate order requests in DigiCert CertCentral. Requests are created when an order requires admin approval before issuance.`,
  instructions: [
    'Use action "list" to get all pending requests.',
    'Use action "get" to view a specific request by ID.',
    'Use action "approve" or "reject" to process a pending request.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'get', 'approve', 'reject']).describe('Operation to perform'),
      requestId: z
        .string()
        .optional()
        .describe('Request ID (required for get, approve, reject)'),
      status: z
        .enum(['pending', 'approved', 'rejected'])
        .optional()
        .describe('Filter requests by status (for list action)'),
      comment: z.string().optional().describe('Comment when approving or rejecting'),
      offset: z.number().optional().describe('Pagination offset for list'),
      limit: z.number().optional().describe('Number of results for list')
    })
  )
  .output(
    z.object({
      requests: z
        .array(
          z.object({
            requestId: z.number().describe('Request ID'),
            status: z.string().describe('Request status'),
            type: z.string().optional().describe('Request type'),
            dateCreated: z.string().optional().describe('Creation date'),
            orderId: z.number().optional().describe('Associated order ID'),
            commonName: z.string().optional().describe('Common name on the certificate'),
            productName: z.string().optional().describe('Certificate product name'),
            requesterName: z
              .string()
              .optional()
              .describe('Name of the user who submitted the request')
          })
        )
        .optional()
        .describe('List of requests (for list action)'),
      requestId: z.number().optional().describe('Request ID (for single request actions)'),
      actionPerformed: z.string().describe('Action that was performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CertCentralClient({
      token: ctx.auth.token,
      platform: ctx.config.platform
    });

    let { action } = ctx.input;

    if (action === 'list') {
      let result = await client.listRequests({
        status: ctx.input.status,
        offset: ctx.input.offset,
        limit: ctx.input.limit
      });

      let requests = (result.requests || []).map((r: any) => ({
        requestId: r.id,
        status: r.status,
        type: r.type,
        dateCreated: r.date,
        orderId: r.order?.id,
        commonName: r.order?.certificate?.common_name,
        productName: r.order?.product?.name,
        requesterName: r.requester
          ? `${r.requester.first_name} ${r.requester.last_name}`
          : undefined
      }));

      return {
        output: {
          requests,
          actionPerformed: 'listed'
        },
        message: `Found **${requests.length}** request(s)${ctx.input.status ? ` with status "${ctx.input.status}"` : ''}.`
      };
    }

    if (!ctx.input.requestId) {
      throw new Error('requestId is required for this action');
    }

    if (action === 'get') {
      let request = await client.getRequest(ctx.input.requestId);

      return {
        output: {
          requests: [
            {
              requestId: request.id,
              status: request.status,
              type: request.type,
              dateCreated: request.date,
              orderId: request.order?.id,
              commonName: request.order?.certificate?.common_name,
              productName: request.order?.product?.name,
              requesterName: request.requester
                ? `${request.requester.first_name} ${request.requester.last_name}`
                : undefined
            }
          ],
          requestId: request.id,
          actionPerformed: 'retrieved'
        },
        message: `Request **#${request.id}** — status: **${request.status}**`
      };
    }

    if (action === 'approve') {
      await client.updateRequestStatus(ctx.input.requestId, 'approved', ctx.input.comment);
      return {
        output: {
          requestId: Number(ctx.input.requestId),
          actionPerformed: 'approved'
        },
        message: `Request **#${ctx.input.requestId}** approved.`
      };
    }

    if (action === 'reject') {
      await client.updateRequestStatus(ctx.input.requestId, 'rejected', ctx.input.comment);
      return {
        output: {
          requestId: Number(ctx.input.requestId),
          actionPerformed: 'rejected'
        },
        message: `Request **#${ctx.input.requestId}** rejected.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();

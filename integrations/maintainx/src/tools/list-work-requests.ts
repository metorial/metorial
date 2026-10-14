import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { organizationIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listWorkRequests = SlateTool.create(spec, {
  name: 'List Work Requests',
  key: 'list_work_requests',
  description:
    'Lists MaintainX work requests with optional title, status, and priority filters. For multi-organization keys, call list_organizations and pass organizationId.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      organizationId: organizationIdSchema,
      title: z.string().optional().describe('Filter by work request title'),
      status: z
        .enum(['PENDING', 'REJECTED', 'APPROVED', 'DONE'])
        .optional()
        .describe('Filter by request status'),
      priority: z
        .enum(['NONE', 'LOW', 'MEDIUM', 'HIGH'])
        .optional()
        .describe('Filter by request priority'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(200)
        .optional()
        .describe('Maximum results per page; defaults to 100'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      workRequests: z.array(
        z.object({
          workRequestId: z.number().describe('Work request ID'),
          title: z.string().describe('Work request title'),
          status: z.string().optional().describe('Current request status'),
          priority: z.string().optional().describe('Request priority'),
          assetId: z.number().optional().describe('Associated asset ID'),
          locationId: z.number().optional().describe('Associated location ID'),
          createdAt: z.string().optional().describe('Creation timestamp'),
          updatedAt: z.string().optional().describe('Last update timestamp')
        })
      ),
      nextCursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let result = await Client.fromContext(ctx).listWorkRequests(ctx.input);
    let workRequests = (result.workRequests ?? []).map(
      (request: {
        id: number;
        title: string;
        requestStatus: 'PENDING' | 'REJECTED' | 'APPROVED' | 'DONE';
        priority?: string;
        assetId?: number | null;
        locationId?: number | null;
        createdAt?: string;
        updatedAt?: string;
      }) => ({
        workRequestId: request.id,
        title: request.title,
        status: request.requestStatus ?? undefined,
        priority: request.priority ?? undefined,
        assetId: request.assetId ?? undefined,
        locationId: request.locationId ?? undefined,
        createdAt: request.createdAt ?? undefined,
        updatedAt: request.updatedAt ?? undefined
      })
    );
    return {
      output: { workRequests, nextCursor: result.nextCursor ?? undefined },
      message: `Found ${workRequests.length} work request(s).`
    };
  })
  .build();

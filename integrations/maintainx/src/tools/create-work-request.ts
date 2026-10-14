import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { organizationIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let createWorkRequest = SlateTool.create(spec, {
  name: 'Create Work Request',
  key: 'create_work_request',
  description: `Creates a new work request in MaintainX. Work requests can be reviewed and approved before being converted into work orders. Useful for request-then-approve maintenance workflows. For multi-organization keys, call list_organizations and pass organizationId.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      organizationId: organizationIdSchema,
      title: z.string().describe('Title of the work request'),
      description: z
        .string()
        .optional()
        .describe('Detailed description of the requested work'),
      priority: z
        .enum(['NONE', 'LOW', 'MEDIUM', 'HIGH'])
        .optional()
        .describe('Requested priority level'),
      assetId: z.number().optional().describe('Asset ID related to this request'),
      locationId: z.number().optional().describe('Location ID for this request')
    })
  )
  .output(
    z.object({
      workRequestId: z.number().describe('ID of the created work request'),
      title: z.string().describe('Title of the work request')
    })
  )
  .handleInvocation(async ctx => {
    let client = Client.fromContext(ctx);

    let result = await client.createWorkRequest({
      title: ctx.input.title,
      description: ctx.input.description,
      priority: ctx.input.priority,
      assetId: ctx.input.assetId,
      locationId: ctx.input.locationId
    });

    let requestId = result.id ?? result.workRequest?.id;

    return {
      output: {
        workRequestId: requestId,
        title: ctx.input.title
      },
      message: `Created work request **"${ctx.input.title}"** (ID: ${requestId}).`
    };
  })
  .build();

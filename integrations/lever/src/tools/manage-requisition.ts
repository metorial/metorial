import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageRequisitionTool = SlateTool.create(spec, {
  name: 'Manage Requisition',
  key: 'manage_requisition',
  description: `Create, update, or delete a hiring requisition. Requisitions support headcount tracking, compensation bands, custom fields, and associations to job postings. Requires API-management of requisitions to be enabled.`,
  instructions: [
    'To create, set action to "create" and provide requisition fields.',
    'To update, provide requisitionId and fields to change.',
    'To delete, provide requisitionId and set action to "delete".'
  ],
  constraints: ['Requires API-management of requisitions to be enabled by a Super Admin.']
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      requisitionId: z
        .string()
        .optional()
        .describe('Requisition ID (required for update/delete)'),
      name: z.string().optional().describe('Requisition name'),
      headcountTotal: z.number().optional().describe('Total headcount for this requisition'),
      compensationBand: z
        .object({
          min: z.number().optional(),
          max: z.number().optional(),
          currency: z.string().optional(),
          interval: z.string().optional()
        })
        .optional()
        .describe('Compensation band'),
      ownerId: z.string().optional().describe('User ID of the requisition owner'),
      hiringManagerId: z.string().optional().describe('User ID of the hiring manager'),
      status: z
        .enum(['open', 'onHold', 'closed', 'draft'])
        .optional()
        .describe('Requisition status'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom fields as key-value pairs'),
      postingIds: z.array(z.string()).optional().describe('Posting IDs to associate')
    })
  )
  .output(
    z.object({
      requisitionId: z.string().optional().describe('ID of the requisition'),
      requisition: z.any().optional().describe('The requisition object'),
      deleted: z.boolean().optional().describe('True if the requisition was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, environment: ctx.auth.environment });

    if (ctx.input.action === 'delete') {
      if (!ctx.input.requisitionId)
        throw new Error('requisitionId is required for delete action');
      await client.deleteRequisition(ctx.input.requisitionId);
      return {
        output: { requisitionId: ctx.input.requisitionId, deleted: true },
        message: `Deleted requisition **${ctx.input.requisitionId}**.`
      };
    }

    let body: Record<string, any> = {};
    if (ctx.input.name) body.name = ctx.input.name;
    if (ctx.input.headcountTotal !== undefined) body.headcountTotal = ctx.input.headcountTotal;
    if (ctx.input.compensationBand) body.compensationBand = ctx.input.compensationBand;
    if (ctx.input.ownerId) body.owner = ctx.input.ownerId;
    if (ctx.input.hiringManagerId) body.hiringManager = ctx.input.hiringManagerId;
    if (ctx.input.status) body.status = ctx.input.status;
    if (ctx.input.customFields) body.customFields = ctx.input.customFields;
    if (ctx.input.postingIds) body.postings = ctx.input.postingIds;

    if (ctx.input.action === 'update') {
      if (!ctx.input.requisitionId)
        throw new Error('requisitionId is required for update action');
      let result = await client.updateRequisition(ctx.input.requisitionId, body);
      return {
        output: { requisitionId: result.data.id, requisition: result.data },
        message: `Updated requisition **${result.data.id}**.`
      };
    }

    let result = await client.createRequisition(body);
    return {
      output: { requisitionId: result.data.id, requisition: result.data },
      message: `Created requisition **${result.data.name || result.data.id}**.`
    };
  })
  .build();

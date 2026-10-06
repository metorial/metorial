import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { band, id, integer, invalid, type Row, stringList, text } from '../lib/contracts';
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
  constraints: [
    'Requires API-management of requisitions to be enabled by a Super Admin.',
    'Replacement updates preserve current writable fields and merge nested custom fields. Concurrent changes after the final read remain possible.'
  ]
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      requisitionId: z
        .string()
        .optional()
        .describe('Requisition ID (required for update/delete)'),
      requisitionCode: z
        .string()
        .optional()
        .describe('Unique external requisition code required for create'),
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
    const client = new Client(ctx.auth);
    const data: Row = {};
    if (ctx.input.name !== undefined) data.name = text(ctx.input.name, 'Requisition name');
    if (ctx.input.requisitionCode !== undefined)
      data.requisitionCode = text(ctx.input.requisitionCode, 'Requisition code');
    if (ctx.input.headcountTotal !== undefined)
      data.headcountTotal = integer(ctx.input.headcountTotal, 'Headcount', 0);
    if (ctx.input.compensationBand !== undefined)
      data.compensationBand = band(ctx.input.compensationBand);
    if (ctx.input.ownerId !== undefined) data.owner = id(ctx.input.ownerId);
    if (ctx.input.hiringManagerId !== undefined)
      data.hiringManager = id(ctx.input.hiringManagerId);
    if (ctx.input.status !== undefined) data.status = ctx.input.status;
    if (ctx.input.customFields !== undefined) data.customFields = ctx.input.customFields;
    if (ctx.input.postingIds !== undefined)
      data.postingIds = stringList(ctx.input.postingIds, 'Posting IDs', true);
    if (ctx.input.action === 'create') {
      if (ctx.input.requisitionId !== undefined)
        invalid('Do not supply requisitionId when creating a requisition.');
      text(data.name, 'Requisition name');
      text(data.requisitionCode, 'Requisition code');
      integer(data.headcountTotal, 'Headcount', 0);
      const result = await client.createRequisition(data);
      return {
        output: { requisitionId: result.data.id, requisition: result.data },
        message: `Created requisition ${result.data.id}.`
      };
    }
    const requisitionId = id(
      ctx.input.requisitionId,
      'Requisition ID; discover it with list_resources'
    );
    if (ctx.input.action === 'delete') {
      if (Object.keys(data).length)
        invalid('Requisition fields cannot be combined with deletion.');
      await client.deleteRequisition(requisitionId);
      return {
        output: { requisitionId, deleted: true },
        message: `Deleted requisition ${requisitionId}.`
      };
    }
    if (!Object.keys(data).length)
      invalid('Provide at least one requisition field to update.');
    const result = await client.updateRequisition(requisitionId, data);
    return {
      output: { requisitionId, requisition: result.data },
      message: `Updated requisition ${requisitionId}.`
    };
  })
  .build();

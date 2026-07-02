import { SlateTool } from 'slates';
import { z } from 'zod';
import { WorkableClient } from '../lib/client';
import { spec } from '../spec';

export let manageRequisitionTool = SlateTool.create(spec, {
  name: 'Manage Requisitions',
  key: 'manage_requisition',
  description: `List, get, create, update, approve, or reject requisitions. Requisitions represent formal requests to fill job positions and typically go through an approval workflow.`,
  instructions: [
    'Use "list" to browse all requisitions, optionally filtering by state',
    'Use "get" with a requisitionId to retrieve full details',
    'Use "create" to submit a new requisition',
    'Use "update" to modify an existing requisition',
    'Use "approve" or "reject" to handle requisition approval workflows'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'approve', 'reject'])
        .describe('The action to perform'),
      requisitionId: z
        .string()
        .optional()
        .describe('Requisition ID (required for get, update, approve, reject)'),
      state: z.string().optional().describe('Filter by state when listing'),
      limit: z.number().optional().describe('Max results when listing'),
      cursor: z.string().optional().describe('Pagination cursor when listing'),
      title: z.string().optional().describe('Requisition title (for create/update)'),
      department: z.string().optional().describe('Department (for create/update)'),
      location: z.string().optional().describe('Location (for create/update)'),
      numberOfOpenings: z
        .number()
        .optional()
        .describe('Number of openings (for create/update)'),
      hiringManager: z.string().optional().describe('Hiring manager ID (for create/update)'),
      reason: z.string().optional().describe('Reason for rejection (for reject action)'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom fields (for create/update)')
    })
  )
  .output(
    z.object({
      requisitions: z
        .array(
          z.object({
            requisitionId: z.string().optional(),
            title: z.string().optional(),
            state: z.string().optional(),
            department: z.string().optional(),
            location: z.string().optional(),
            numberOfOpenings: z.number().optional(),
            createdAt: z.string().optional()
          })
        )
        .optional()
        .describe('List of requisitions (for list action)'),
      requisition: z
        .object({
          requisitionId: z.string().optional(),
          title: z.string().optional(),
          state: z.string().optional(),
          department: z.string().optional(),
          location: z.string().optional(),
          numberOfOpenings: z.number().optional(),
          createdAt: z.string().optional()
        })
        .optional()
        .describe('Single requisition details'),
      actionPerformed: z.string().describe('Description of action performed'),
      paging: z
        .object({
          next: z.string().optional()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new WorkableClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let mapRequisition = (r: any) => ({
      requisitionId: r.id,
      title: r.title,
      state: r.state,
      department: r.department,
      location: r.location,
      numberOfOpenings: r.number_of_openings,
      createdAt: r.created_at
    });

    switch (ctx.input.action) {
      case 'list': {
        let result = await client.listRequisitions({
          state: ctx.input.state,
          limit: ctx.input.limit,
          cursor: ctx.input.cursor
        });
        let requisitions = (result.requisitions || []).map(mapRequisition);
        return {
          output: {
            requisitions,
            actionPerformed: 'Listed requisitions',
            paging: result.paging
          },
          message: `Found **${requisitions.length}** requisition(s).`
        };
      }
      case 'get': {
        if (!ctx.input.requisitionId)
          throw new Error('requisitionId is required for get action');
        let result = await client.getRequisition(ctx.input.requisitionId);
        let req = result.requisition || result;
        return {
          output: {
            requisition: mapRequisition(req),
            actionPerformed: 'Retrieved requisition'
          },
          message: `Retrieved requisition **"${req.title}"** (${req.id}).`
        };
      }
      case 'create': {
        let payload: any = {};
        if (ctx.input.title) payload.title = ctx.input.title;
        if (ctx.input.department) payload.department = ctx.input.department;
        if (ctx.input.location) payload.location = ctx.input.location;
        if (ctx.input.numberOfOpenings !== undefined)
          payload.number_of_openings = ctx.input.numberOfOpenings;
        if (ctx.input.hiringManager) payload.hiring_manager = ctx.input.hiringManager;
        if (ctx.input.customFields) payload.custom_fields = ctx.input.customFields;

        let result = await client.createRequisition(payload);
        let req = result.requisition || result;
        return {
          output: {
            requisition: mapRequisition(req),
            actionPerformed: 'Created requisition'
          },
          message: `Created requisition **"${req.title || ctx.input.title}"**.`
        };
      }
      case 'update': {
        if (!ctx.input.requisitionId)
          throw new Error('requisitionId is required for update action');
        let payload: any = {};
        if (ctx.input.title) payload.title = ctx.input.title;
        if (ctx.input.department) payload.department = ctx.input.department;
        if (ctx.input.location) payload.location = ctx.input.location;
        if (ctx.input.numberOfOpenings !== undefined)
          payload.number_of_openings = ctx.input.numberOfOpenings;
        if (ctx.input.hiringManager) payload.hiring_manager = ctx.input.hiringManager;
        if (ctx.input.customFields) payload.custom_fields = ctx.input.customFields;

        let result = await client.updateRequisition(ctx.input.requisitionId, payload);
        let req = result.requisition || result;
        return {
          output: {
            requisition: mapRequisition(req),
            actionPerformed: 'Updated requisition'
          },
          message: `Updated requisition **${ctx.input.requisitionId}**.`
        };
      }
      case 'approve': {
        if (!ctx.input.requisitionId)
          throw new Error('requisitionId is required for approve action');
        await client.approveRequisition(ctx.input.requisitionId);
        return {
          output: {
            actionPerformed: `Approved requisition ${ctx.input.requisitionId}`
          },
          message: `Approved requisition **${ctx.input.requisitionId}**.`
        };
      }
      case 'reject': {
        if (!ctx.input.requisitionId)
          throw new Error('requisitionId is required for reject action');
        await client.rejectRequisition(ctx.input.requisitionId, ctx.input.reason);
        return {
          output: {
            actionPerformed: `Rejected requisition ${ctx.input.requisitionId}`
          },
          message: `Rejected requisition **${ctx.input.requisitionId}**.`
        };
      }
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();

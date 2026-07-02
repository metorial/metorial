import { SlateTool } from 'slates';
import { z } from 'zod';
import { CoupaClient } from '../lib/client';
import { spec } from '../spec';

let approvalOutputSchema = z.object({
  approvalId: z.number().describe('Coupa approval ID'),
  status: z.string().nullable().optional().describe('Approval status'),
  approvalType: z.string().nullable().optional().describe('Type of approvable document'),
  approvableId: z.number().nullable().optional().describe('ID of the approvable document'),
  approver: z.any().nullable().optional().describe('Approver user object'),
  approvalDate: z.string().nullable().optional().describe('Approval date'),
  note: z.string().nullable().optional().describe('Approval note or reason'),
  createdAt: z.string().nullable().optional().describe('Creation timestamp'),
  updatedAt: z.string().nullable().optional().describe('Last update timestamp'),
  rawData: z.any().optional().describe('Complete raw approval data')
});

export let searchApprovals = SlateTool.create(spec, {
  name: 'Search Approvals',
  key: 'search_approvals',
  description: `Search and list approvals in Coupa. Filter by status, approver, type (requisitions, purchase orders, invoices, expenses), and other attributes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .string()
        .optional()
        .describe(
          'Filter by approval status (e.g. "pending_approval", "approved", "rejected")'
        ),
      approverId: z.number().optional().describe('Filter by approver user ID'),
      approvableType: z
        .string()
        .optional()
        .describe(
          'Filter by document type (e.g. "RequisitionHeader", "OrderHeader", "InvoiceHeader")'
        ),
      updatedAfter: z
        .string()
        .optional()
        .describe('Filter approvals updated after this date (ISO 8601)'),
      filters: z
        .record(z.string(), z.string())
        .optional()
        .describe('Additional Coupa query filters'),
      orderBy: z.string().optional().describe('Field to sort by'),
      sortDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      limit: z.number().optional().describe('Maximum number of results'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      approvals: z.array(approvalOutputSchema).describe('List of matching approvals'),
      count: z.number().describe('Number of approvals returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CoupaClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    let filters: Record<string, string> = {};
    if (ctx.input.filters) {
      for (let [key, value] of Object.entries(ctx.input.filters)) {
        filters[key] = value;
      }
    }
    if (ctx.input.status) filters.status = ctx.input.status;
    if (ctx.input.approverId) filters['approver[id]'] = String(ctx.input.approverId);
    if (ctx.input.approvableType) filters['approvable-type'] = ctx.input.approvableType;
    if (ctx.input.updatedAfter) filters['updated-at[gt]'] = ctx.input.updatedAfter;

    let results = await client.listApprovals({
      filters,
      orderBy: ctx.input.orderBy,
      dir: ctx.input.sortDirection,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let approvals = (Array.isArray(results) ? results : []).map((a: any) => ({
      approvalId: a.id,
      status: a.status ?? null,
      approvalType: a['approvable-type'] ?? a.approvable_type ?? null,
      approvableId: a['approvable-id'] ?? a.approvable_id ?? null,
      approver: a.approver ?? null,
      approvalDate: a['approval-date'] ?? a.approval_date ?? null,
      note: a.note ?? null,
      createdAt: a['created-at'] ?? a.created_at ?? null,
      updatedAt: a['updated-at'] ?? a.updated_at ?? null,
      rawData: a
    }));

    return {
      output: {
        approvals,
        count: approvals.length
      },
      message: `Found **${approvals.length}** approval(s).`
    };
  })
  .build();

export let processApproval = SlateTool.create(spec, {
  name: 'Process Approval',
  key: 'process_approval',
  description: `Approve or reject a pending approval in Coupa. Provide the approval ID and the desired action (approve or reject) along with an optional reason.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      approvalId: z.number().describe('ID of the approval to process'),
      action: z.enum(['approve', 'reject']).describe('Action to take on the approval'),
      reason: z
        .string()
        .optional()
        .describe('Reason for the approval/rejection (required for rejection)')
    })
  )
  .output(approvalOutputSchema)
  .handleInvocation(async ctx => {
    let client = new CoupaClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    let result: any;
    if (ctx.input.action === 'approve') {
      result = await client.approveApproval(ctx.input.approvalId, ctx.input.reason);
    } else {
      result = await client.rejectApproval(
        ctx.input.approvalId,
        ctx.input.reason ?? 'Rejected'
      );
    }

    return {
      output: {
        approvalId: result.id,
        status: result.status ?? null,
        approvalType: result['approvable-type'] ?? result.approvable_type ?? null,
        approvableId: result['approvable-id'] ?? result.approvable_id ?? null,
        approver: result.approver ?? null,
        approvalDate: result['approval-date'] ?? result.approval_date ?? null,
        note: result.note ?? null,
        createdAt: result['created-at'] ?? result.created_at ?? null,
        updatedAt: result['updated-at'] ?? result.updated_at ?? null,
        rawData: result
      },
      message: `${ctx.input.action === 'approve' ? 'Approved' : 'Rejected'} approval **#${ctx.input.approvalId}**.`
    };
  })
  .build();

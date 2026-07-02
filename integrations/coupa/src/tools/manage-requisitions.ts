import { SlateTool } from 'slates';
import { z } from 'zod';
import { CoupaClient } from '../lib/client';
import { spec } from '../spec';

let requisitionOutputSchema = z.object({
  requisitionId: z.number().describe('Coupa internal requisition ID'),
  requisitionNumber: z.string().nullable().optional().describe('Requisition number'),
  status: z.string().nullable().optional().describe('Requisition status'),
  requestedBy: z.any().nullable().optional().describe('Requesting user'),
  department: z.any().nullable().optional().describe('Department'),
  currency: z.any().nullable().optional().describe('Currency'),
  requisitionLines: z.array(z.any()).nullable().optional().describe('Requisition line items'),
  totalAmount: z.any().nullable().optional().describe('Total amount'),
  justification: z.string().nullable().optional().describe('Requisition justification'),
  createdAt: z.string().nullable().optional().describe('Creation timestamp'),
  updatedAt: z.string().nullable().optional().describe('Last update timestamp'),
  rawData: z.any().optional().describe('Complete raw requisition data')
});

export let searchRequisitions = SlateTool.create(spec, {
  name: 'Search Requisitions',
  key: 'search_requisitions',
  description: `Search and list purchase requisitions in Coupa. Filter by status, requester, date range, and other attributes.`,
  instructions: [
    'Common statuses: cart, pending_approval, approved, ordered, partially_received, received, denied.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z.string().optional().describe('Filter by status'),
      requestedById: z.number().optional().describe('Filter by requesting user ID'),
      createdAfter: z
        .string()
        .optional()
        .describe('Filter requisitions created after this date (ISO 8601)'),
      updatedAfter: z
        .string()
        .optional()
        .describe('Filter requisitions updated after this date (ISO 8601)'),
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
      requisitions: z.array(requisitionOutputSchema).describe('List of matching requisitions'),
      count: z.number().describe('Number of requisitions returned')
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
    if (ctx.input.requestedById) filters['requested-by[id]'] = String(ctx.input.requestedById);
    if (ctx.input.createdAfter) filters['created-at[gt]'] = ctx.input.createdAfter;
    if (ctx.input.updatedAfter) filters['updated-at[gt]'] = ctx.input.updatedAfter;

    let results = await client.listRequisitions({
      filters,
      orderBy: ctx.input.orderBy,
      dir: ctx.input.sortDirection,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let requisitions = (Array.isArray(results) ? results : []).map((r: any) => ({
      requisitionId: r.id,
      requisitionNumber: r['requisition-number'] ?? r.requisition_number ?? null,
      status: r.status ?? null,
      requestedBy: r['requested-by'] ?? r.requested_by ?? null,
      department: r.department ?? null,
      currency: r.currency ?? null,
      requisitionLines: r['requisition-lines'] ?? r.requisition_lines ?? null,
      totalAmount: r.total ?? r.total ?? null,
      justification: r.justification ?? null,
      createdAt: r['created-at'] ?? r.created_at ?? null,
      updatedAt: r['updated-at'] ?? r.updated_at ?? null,
      rawData: r
    }));

    return {
      output: {
        requisitions,
        count: requisitions.length
      },
      message: `Found **${requisitions.length}** requisition(s).`
    };
  })
  .build();

export let createRequisition = SlateTool.create(spec, {
  name: 'Create Requisition',
  key: 'create_requisition',
  description: `Create a new purchase requisition in Coupa with line items. The requisition can then flow through the approval process.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      requestedById: z.number().optional().describe('ID of the user making the request'),
      justification: z.string().optional().describe('Justification for the requisition'),
      currency: z.object({ code: z.string() }).optional().describe('Currency'),
      department: z.object({ name: z.string() }).optional().describe('Department'),
      shipToAddress: z
        .object({
          addressId: z.number()
        })
        .optional()
        .describe('Ship-to address reference'),
      requisitionLines: z
        .array(
          z.object({
            description: z.string().describe('Line item description'),
            quantity: z.number().describe('Quantity'),
            unitPrice: z.number().describe('Unit price'),
            needByDate: z.string().optional().describe('Need-by date (ISO 8601)'),
            supplierId: z.number().optional().describe('Preferred supplier ID'),
            commodity: z.object({ name: z.string() }).optional().describe('Commodity'),
            account: z.any().optional().describe('Account for this line')
          })
        )
        .min(1)
        .describe('Requisition lines'),
      customFields: z.record(z.string(), z.any()).optional().describe('Custom field values')
    })
  )
  .output(requisitionOutputSchema)
  .handleInvocation(async ctx => {
    let client = new CoupaClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    let payload: any = {
      'requisition-lines': ctx.input.requisitionLines.map((line, idx) => {
        let rl: any = {
          description: line.description,
          quantity: String(line.quantity),
          'unit-price': String(line.unitPrice),
          'line-num': idx + 1
        };
        if (line.needByDate) rl['need-by-date'] = line.needByDate;
        if (line.supplierId) rl.supplier = { id: line.supplierId };
        if (line.commodity) rl.commodity = line.commodity;
        if (line.account) rl.account = line.account;
        return rl;
      })
    };

    if (ctx.input.requestedById) payload['requested-by'] = { id: ctx.input.requestedById };
    if (ctx.input.justification) payload.justification = ctx.input.justification;
    if (ctx.input.currency) payload.currency = ctx.input.currency;
    if (ctx.input.department) payload.department = ctx.input.department;
    if (ctx.input.shipToAddress)
      payload['ship-to-address'] = { id: ctx.input.shipToAddress.addressId };

    if (ctx.input.customFields) {
      for (let [key, value] of Object.entries(ctx.input.customFields)) {
        payload[key] = value;
      }
    }

    let result = await client.createRequisition(payload);

    return {
      output: {
        requisitionId: result.id,
        requisitionNumber: result['requisition-number'] ?? result.requisition_number ?? null,
        status: result.status ?? null,
        requestedBy: result['requested-by'] ?? result.requested_by ?? null,
        department: result.department ?? null,
        currency: result.currency ?? null,
        requisitionLines: result['requisition-lines'] ?? result.requisition_lines ?? null,
        totalAmount: result.total ?? result.total ?? null,
        justification: result.justification ?? null,
        createdAt: result['created-at'] ?? result.created_at ?? null,
        updatedAt: result['updated-at'] ?? result.updated_at ?? null,
        rawData: result
      },
      message: `Created requisition **#${result['requisition-number'] ?? result.requisition_number ?? result.id}** (status: ${result.status}).`
    };
  })
  .build();

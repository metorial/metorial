import { SlateTool } from 'slates';
import { z } from 'zod';
import { CoupaClient } from '../lib/client';
import { spec } from '../spec';

let contractOutputSchema = z.object({
  contractId: z.number().describe('Coupa internal contract ID'),
  contractNumber: z.string().nullable().optional().describe('Contract number'),
  name: z.string().nullable().optional().describe('Contract name'),
  status: z.string().nullable().optional().describe('Contract status'),
  type: z.string().nullable().optional().describe('Contract type'),
  supplier: z.any().nullable().optional().describe('Supplier object'),
  startDate: z.string().nullable().optional().describe('Contract start date'),
  endDate: z.string().nullable().optional().describe('Contract end date'),
  maxValue: z.any().nullable().optional().describe('Maximum contract value'),
  minValue: z.any().nullable().optional().describe('Minimum contract value'),
  currency: z.any().nullable().optional().describe('Currency'),
  terms: z.string().nullable().optional().describe('Contract terms'),
  createdAt: z.string().nullable().optional().describe('Creation timestamp'),
  updatedAt: z.string().nullable().optional().describe('Last update timestamp'),
  rawData: z.any().optional().describe('Complete raw contract data')
});

export let searchContracts = SlateTool.create(spec, {
  name: 'Search Contracts',
  key: 'search_contracts',
  description: `Search and list contracts in Coupa. Filter by status, supplier, type, date ranges, and other attributes.`,
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
          'Filter by status (e.g. "draft", "pending_approval", "published", "expired", "closed")'
        ),
      supplierId: z.number().optional().describe('Filter by supplier ID'),
      type: z.string().optional().describe('Filter by contract type'),
      createdAfter: z
        .string()
        .optional()
        .describe('Filter contracts created after this date (ISO 8601)'),
      updatedAfter: z
        .string()
        .optional()
        .describe('Filter contracts updated after this date (ISO 8601)'),
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
      contracts: z.array(contractOutputSchema).describe('List of matching contracts'),
      count: z.number().describe('Number of contracts returned')
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
    if (ctx.input.supplierId) filters['supplier[id]'] = String(ctx.input.supplierId);
    if (ctx.input.type) filters.type = ctx.input.type;
    if (ctx.input.createdAfter) filters['created-at[gt]'] = ctx.input.createdAfter;
    if (ctx.input.updatedAfter) filters['updated-at[gt]'] = ctx.input.updatedAfter;

    let results = await client.listContracts({
      filters,
      orderBy: ctx.input.orderBy,
      dir: ctx.input.sortDirection,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let contracts = (Array.isArray(results) ? results : []).map((c: any) => ({
      contractId: c.id,
      contractNumber: c['contract-number'] ?? c.contract_number ?? null,
      name: c.name ?? null,
      status: c.status ?? null,
      type: c.type ?? null,
      supplier: c.supplier ?? null,
      startDate: c['start-date'] ?? c.start_date ?? null,
      endDate: c['end-date'] ?? c.end_date ?? null,
      maxValue: c['max-value'] ?? c.max_value ?? null,
      minValue: c['min-value'] ?? c.min_value ?? null,
      currency: c.currency ?? null,
      terms: c.terms ?? null,
      createdAt: c['created-at'] ?? c.created_at ?? null,
      updatedAt: c['updated-at'] ?? c.updated_at ?? null,
      rawData: c
    }));

    return {
      output: {
        contracts,
        count: contracts.length
      },
      message: `Found **${contracts.length}** contract(s).`
    };
  })
  .build();

export let createContract = SlateTool.create(spec, {
  name: 'Create Contract',
  key: 'create_contract',
  description: `Create a new contract in Coupa with header details, supplier association, and date range.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Contract name'),
      type: z.string().optional().describe('Contract type'),
      supplierId: z.number().optional().describe('Supplier ID to associate with the contract'),
      startDate: z.string().optional().describe('Contract start date (ISO 8601)'),
      endDate: z.string().optional().describe('Contract end date (ISO 8601)'),
      maxValue: z.number().optional().describe('Maximum contract value'),
      minValue: z.number().optional().describe('Minimum contract value'),
      currency: z.object({ code: z.string() }).optional().describe('Contract currency'),
      terms: z.string().optional().describe('Contract terms text'),
      customFields: z.record(z.string(), z.any()).optional().describe('Custom field values')
    })
  )
  .output(contractOutputSchema)
  .handleInvocation(async ctx => {
    let client = new CoupaClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    let payload: any = {
      name: ctx.input.name
    };

    if (ctx.input.type) payload.type = ctx.input.type;
    if (ctx.input.supplierId) payload.supplier = { id: ctx.input.supplierId };
    if (ctx.input.startDate) payload['start-date'] = ctx.input.startDate;
    if (ctx.input.endDate) payload['end-date'] = ctx.input.endDate;
    if (ctx.input.maxValue !== undefined) payload['max-value'] = String(ctx.input.maxValue);
    if (ctx.input.minValue !== undefined) payload['min-value'] = String(ctx.input.minValue);
    if (ctx.input.currency) payload.currency = ctx.input.currency;
    if (ctx.input.terms) payload.terms = ctx.input.terms;

    if (ctx.input.customFields) {
      for (let [key, value] of Object.entries(ctx.input.customFields)) {
        payload[key] = value;
      }
    }

    let result = await client.createContract(payload);

    return {
      output: {
        contractId: result.id,
        contractNumber: result['contract-number'] ?? result.contract_number ?? null,
        name: result.name ?? null,
        status: result.status ?? null,
        type: result.type ?? null,
        supplier: result.supplier ?? null,
        startDate: result['start-date'] ?? result.start_date ?? null,
        endDate: result['end-date'] ?? result.end_date ?? null,
        maxValue: result['max-value'] ?? result.max_value ?? null,
        minValue: result['min-value'] ?? result.min_value ?? null,
        currency: result.currency ?? null,
        terms: result.terms ?? null,
        createdAt: result['created-at'] ?? result.created_at ?? null,
        updatedAt: result['updated-at'] ?? result.updated_at ?? null,
        rawData: result
      },
      message: `Created contract **"${result.name ?? result.id}"** (status: ${result.status}).`
    };
  })
  .build();

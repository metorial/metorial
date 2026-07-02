import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let financialDocumentSchema = z.object({
  documentId: z.string().describe('Unique JobNimbus ID'),
  documentType: z.string().describe('Type: "estimate" or "invoice"'),
  number: z.string().optional().describe('Document number'),
  statusName: z.string().optional().describe('Current status'),
  recordTypeName: z.string().optional().describe('Record type name'),
  parentRecordId: z.string().optional().describe('Parent contact/job ID'),
  customerNote: z.string().optional().describe('Customer-facing note'),
  internalNote: z.string().optional().describe('Internal note'),
  salesRep: z.string().optional().describe('Sales rep ID'),
  createdByName: z.string().optional().describe('Creator name'),
  dateCreated: z.number().optional().describe('Unix timestamp of creation'),
  dateUpdated: z.number().optional().describe('Unix timestamp of last update')
});

export let listFinancialDocuments = SlateTool.create(spec, {
  name: 'List Financial Documents',
  key: 'list_financial_documents',
  description: `List estimates and/or invoices from JobNimbus. Can filter by document type, status, and parent record. Returns paginated results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      documentType: z
        .enum(['estimate', 'invoice'])
        .describe('Type of financial document to list'),
      parentRecordId: z.string().optional().describe('Filter by parent contact or job ID'),
      statusName: z.string().optional().describe('Filter by status name'),
      from: z.number().optional().describe('Pagination offset (0-based). Defaults to 0.'),
      size: z
        .number()
        .optional()
        .describe('Number of results per page. Defaults to 25. Max 200.')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of matching documents'),
      documents: z.array(financialDocumentSchema).describe('List of financial documents')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let mustClauses: any[] = [];

    if (ctx.input.parentRecordId) {
      mustClauses.push({ term: { primary: ctx.input.parentRecordId } });
    }
    if (ctx.input.statusName) {
      mustClauses.push({ term: { status_name: ctx.input.statusName } });
    }

    let filter = mustClauses.length > 0 ? { must: mustClauses } : undefined;
    let params = { from: ctx.input.from, size: ctx.input.size, filter };

    let result =
      ctx.input.documentType === 'estimate'
        ? await client.listEstimates(params)
        : await client.listInvoices(params);

    let documents = (result.results || []).map((d: any) => ({
      documentId: d.jnid,
      documentType: ctx.input.documentType,
      number: d.number,
      statusName: d.status_name,
      recordTypeName: d.record_type_name,
      parentRecordId: d.primary,
      customerNote: d.customer_note,
      internalNote: d.internal_note,
      salesRep: d.sales_rep,
      createdByName: d.created_by_name,
      dateCreated: d.date_created,
      dateUpdated: d.date_updated
    }));

    return {
      output: {
        totalCount: result.count || 0,
        documents
      },
      message: `Found **${result.count || 0}** ${ctx.input.documentType}s. Returned ${documents.length} results.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { PandaDocClient } from '../lib/client';
import { spec } from '../spec';

export let listDocuments = SlateTool.create(spec, {
  name: 'List Documents',
  key: 'list_documents',
  description: `Search and list PandaDoc documents with filtering by status, date ranges, template, folder, tag, contact, and metadata. Supports pagination and sorting.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search by document name or reference number'),
      status: z
        .enum([
          'draft',
          'sent',
          'completed',
          'uploaded',
          'error',
          'viewed',
          'waiting_approval',
          'approved',
          'rejected',
          'waiting_pay',
          'paid',
          'voided',
          'declined',
          'external_review'
        ])
        .optional()
        .describe('Filter by document status'),
      templateId: z.string().optional().describe('Filter by template UUID'),
      folderUuid: z.string().optional().describe('Filter by folder UUID'),
      tag: z.string().optional().describe('Filter by tag'),
      contactId: z.string().optional().describe('Filter by contact ID'),
      createdFrom: z
        .string()
        .optional()
        .describe('Filter documents created after this ISO 8601 date'),
      createdTo: z
        .string()
        .optional()
        .describe('Filter documents created before this ISO 8601 date'),
      modifiedFrom: z
        .string()
        .optional()
        .describe('Filter documents modified after this ISO 8601 date'),
      modifiedTo: z
        .string()
        .optional()
        .describe('Filter documents modified before this ISO 8601 date'),
      completedFrom: z
        .string()
        .optional()
        .describe('Filter documents completed after this ISO 8601 date'),
      completedTo: z
        .string()
        .optional()
        .describe('Filter documents completed before this ISO 8601 date'),
      orderBy: z
        .enum(['date_created', 'date_status_changed', 'date_modified', 'name'])
        .optional()
        .describe('Sort order'),
      page: z.number().optional().describe('Page number (starts at 1)'),
      count: z.number().optional().describe('Items per page (max 100, default 50)'),
      deleted: z.boolean().optional().describe('If true, show only deleted documents'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Filter by metadata key-value pairs')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of matching documents'),
      documents: z
        .array(
          z.object({
            documentId: z.string().describe('Document UUID'),
            documentName: z.string().describe('Document name'),
            status: z.string().describe('Document status'),
            dateCreated: z.string().describe('ISO 8601 creation date'),
            dateModified: z.string().describe('ISO 8601 last modified date'),
            expirationDate: z.string().nullable().describe('ISO 8601 expiration date'),
            version: z.string().optional().describe('Document version')
          })
        )
        .describe('List of documents')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PandaDocClient({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let statusMap: Record<string, number> = {
      draft: 0,
      sent: 1,
      completed: 2,
      uploaded: 3,
      error: 4,
      viewed: 5,
      waiting_approval: 6,
      approved: 7,
      rejected: 8,
      waiting_pay: 9,
      paid: 10,
      voided: 11,
      declined: 12,
      external_review: 13
    };

    let params: any = {};
    if (ctx.input.query) params.q = ctx.input.query;
    if (ctx.input.status) params.status = statusMap[ctx.input.status];
    if (ctx.input.templateId) params.template_id = ctx.input.templateId;
    if (ctx.input.folderUuid) params.folder_uuid = ctx.input.folderUuid;
    if (ctx.input.tag) params.tag = ctx.input.tag;
    if (ctx.input.contactId) params.contact_id = ctx.input.contactId;
    if (ctx.input.createdFrom) params.created_from = ctx.input.createdFrom;
    if (ctx.input.createdTo) params.created_to = ctx.input.createdTo;
    if (ctx.input.modifiedFrom) params.modified_from = ctx.input.modifiedFrom;
    if (ctx.input.modifiedTo) params.modified_to = ctx.input.modifiedTo;
    if (ctx.input.completedFrom) params.completed_from = ctx.input.completedFrom;
    if (ctx.input.completedTo) params.completed_to = ctx.input.completedTo;
    if (ctx.input.orderBy) params.order_by = ctx.input.orderBy;
    if (ctx.input.page) params.page = ctx.input.page;
    if (ctx.input.count) params.count = ctx.input.count;
    if (ctx.input.deleted !== undefined) params.deleted = ctx.input.deleted;
    if (ctx.input.metadata) {
      for (let [key, value] of Object.entries(ctx.input.metadata)) {
        params[`metadata_${key}`] = value;
      }
    }

    let result = await client.listDocuments(params);

    let documents = (result.results || []).map((doc: any) => ({
      documentId: doc.id,
      documentName: doc.name,
      status: doc.status,
      dateCreated: doc.date_created,
      dateModified: doc.date_modified,
      expirationDate: doc.expiration_date || null,
      version: doc.version
    }));

    return {
      output: {
        totalCount: result.count || documents.length,
        documents
      },
      message: `Found **${result.count || documents.length}** documents. Returned ${documents.length} results.`
    };
  })
  .build();

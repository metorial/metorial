import { SlateTool } from 'slates';
import { z } from 'zod';
import { businessCentralEntityPath } from '../../lib/business-central/client';
import { businessCentralValidationError } from '../../lib/business-central/errors';
import { spec } from '../../spec';
import {
  type BusinessCentralContext,
  booleanValue,
  buildODataParams,
  compactRecord,
  companyInputFields,
  companyPath,
  createClient,
  listInputFields,
  numberValue,
  type ODataInput,
  pageOutputSchema,
  pageSummary,
  rawRecordSchema,
  resolveCompanyId,
  stringValue
} from './shared';

type AttachmentContext = BusinessCentralContext & {
  input: BusinessCentralContext['input'] &
    ODataInput & {
      parentResource: keyof typeof parentResourceAttachmentSources;
      parentId: string;
    };
};

let ATTACHMENT_CONTENT_FIELD = 'attachmentContent';

let parentResourceAttachmentSources = {
  customer: { collection: 'customers', navigation: 'documentAttachments' },
  vendor: { collection: 'vendors', navigation: 'documentAttachments' },
  item: { collection: 'items', navigation: 'documentAttachments' },
  salesInvoice: { collection: 'salesInvoices', navigation: 'documentAttachments' },
  purchaseInvoice: { collection: 'purchaseInvoices', navigation: 'documentAttachments' },
  generalLedgerEntry: { collection: 'generalLedgerEntries', navigation: 'attachments' }
} as const;

let documentAttachmentSchema = z.object({
  id: z.string().optional(),
  parentResource: z.string().optional(),
  parentId: z.string().optional(),
  parentType: z.string().optional(),
  fileName: z.string().optional(),
  fileExtension: z.string().optional(),
  contentType: z.string().optional(),
  byteSize: z.number().optional(),
  size: z.number().optional(),
  lineNumber: z.number().optional(),
  documentFlowSales: z.boolean().optional(),
  documentFlowPurchase: z.boolean().optional(),
  createdDateTime: z.string().optional(),
  lastModifiedDateTime: z.string().optional(),
  record: rawRecordSchema
});

let assertNoAttachmentContentSelect = (input: ODataInput) => {
  if (input.select?.some(field => field.trim() === ATTACHMENT_CONTENT_FIELD)) {
    throw businessCentralValidationError(
      'list_document_attachments returns metadata only. Do not select attachmentContent; file contents must be returned through Slate attachments.'
    );
  }
};

let metadataRecord = (record: Record<string, unknown>) => {
  if (!Object.prototype.hasOwnProperty.call(record, ATTACHMENT_CONTENT_FIELD)) return record;

  let sanitized = { ...record };
  delete sanitized[ATTACHMENT_CONTENT_FIELD];
  return sanitized;
};

let mapDocumentAttachment = (
  record: Record<string, unknown>,
  parentResource: string,
  parentId: string
) => ({
  ...compactRecord({
    id: stringValue(record, 'id'),
    parentResource,
    parentId: stringValue(record, 'parentId') ?? parentId,
    parentType: stringValue(record, 'parentType'),
    fileName: stringValue(record, 'fileName') ?? stringValue(record, 'name'),
    fileExtension: stringValue(record, 'fileExtension'),
    contentType: stringValue(record, 'contentType') ?? stringValue(record, 'mimeType'),
    byteSize: numberValue(record, 'byteSize'),
    size:
      numberValue(record, 'byteSize') ??
      numberValue(record, 'size') ??
      numberValue(record, 'contentLength'),
    lineNumber: numberValue(record, 'lineNumber'),
    documentFlowSales: booleanValue(record, 'documentFlowSales'),
    documentFlowPurchase: booleanValue(record, 'documentFlowPurchase'),
    createdDateTime: stringValue(record, 'createdDateTime'),
    lastModifiedDateTime: stringValue(record, 'lastModifiedDateTime')
  }),
  record: metadataRecord(record)
});

export let listDocumentAttachments = SlateTool.create(spec, {
  name: 'List Business Central Document Attachments',
  key: 'list_document_attachments',
  description:
    'List Business Central document attachment metadata for supported parent records such as customers, vendors, items, invoices, and general ledger entries.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ...companyInputFields,
      ...listInputFields,
      parentResource: z
        .enum([
          'customer',
          'vendor',
          'item',
          'salesInvoice',
          'purchaseInvoice',
          'generalLedgerEntry'
        ])
        .describe(
          'Parent record type whose Business Central attachment navigation should be listed.'
        ),
      parentId: z.string().describe('Business Central ID for the selected parent record.')
    })
  )
  .output(
    z.object({
      documentAttachments: z
        .array(documentAttachmentSchema)
        .describe('Document attachment metadata returned by Business Central.'),
      page: pageOutputSchema
    })
  )
  .handleInvocation(async rawCtx => {
    let ctx = rawCtx as AttachmentContext;
    assertNoAttachmentContentSelect(ctx.input);
    let client = createClient(ctx);
    let companyId = resolveCompanyId(ctx);
    let source = parentResourceAttachmentSources[ctx.input.parentResource];
    let { params, page } = buildODataParams(ctx, ctx.input);
    let response = await client.getList<Record<string, unknown>>(
      'list document attachments',
      `/${companyPath(companyId)}/${businessCentralEntityPath(
        source.collection,
        ctx.input.parentId
      )}/${source.navigation}`,
      params
    );
    let documentAttachments = response.value!.map(record =>
      mapDocumentAttachment(record, ctx.input.parentResource, ctx.input.parentId)
    );

    return {
      output: {
        documentAttachments,
        page: pageSummary(response, page)
      },
      message: `Found **${documentAttachments.length}** Business Central document attachment record(s).`
    };
  })
  .build();

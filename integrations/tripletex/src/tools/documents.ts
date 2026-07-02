import { createBase64Attachment, SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import {
  asNumber,
  asRecord,
  asString,
  commonParams,
  companyIdFor,
  createClient,
  listMetadataSchema,
  listOutput,
  pagingInputShape,
  rawRecordSchema
} from './shared';

let documentArchiveObjectTypeSchema = z.enum([
  'customer',
  'supplier',
  'project',
  'product',
  'account'
]);

let documentArchiveSchema = z.object({
  id: z.number().optional(),
  version: z.number().optional(),
  fileName: z.string().optional(),
  size: z.number().optional(),
  archiveDate: z.string().optional(),
  mimeType: z.string().optional(),
  raw: rawRecordSchema
});

let documentSchema = z.object({
  id: z.number().optional(),
  version: z.number().optional(),
  fileName: z.string().optional(),
  size: z.number().optional(),
  mimeType: z.string().optional(),
  raw: rawRecordSchema
});

let documentContentOutputSchema = z.object({
  documentId: z.number().describe('Tripletex document id'),
  filename: z.string().describe('Attachment filename hint'),
  mimeType: z.string().describe('MIME type of the returned attachment'),
  byteLength: z.number().describe('Decoded byte length of the returned attachment'),
  attachmentCount: z.number().describe('Number of attachments returned')
});

let documentArchivePaths: Record<z.infer<typeof documentArchiveObjectTypeSchema>, string> = {
  customer: '/documentArchive/customer',
  supplier: '/documentArchive/supplier',
  project: '/documentArchive/project',
  product: '/documentArchive/product',
  account: '/documentArchive/account'
};

let mapDocumentArchive = (value: unknown): z.infer<typeof documentArchiveSchema> => {
  let record = asRecord(value);
  return {
    id: asNumber(record.id),
    version: asNumber(record.version),
    fileName: asString(record.fileName),
    size: asNumber(record.size),
    archiveDate: asString(record.archiveDate),
    mimeType: asString(record.mimeType),
    raw: record
  };
};

let mapDocument = (value: unknown): z.infer<typeof documentSchema> => {
  let record = asRecord(value);
  return {
    id: asNumber(record.id),
    version: asNumber(record.version),
    fileName: asString(record.fileName),
    size: asNumber(record.size),
    mimeType: asString(record.mimeType),
    raw: record
  };
};

export let listDocumentArchive = SlateTool.create(spec, {
  name: 'List Document Archive',
  key: 'list_document_archive',
  description:
    'List Tripletex document archive metadata attached to a customer, supplier, project, product, or ledger account.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      objectType: documentArchiveObjectTypeSchema.describe(
        'Tripletex object type whose document archive should be listed'
      ),
      objectId: z.number().int().positive().describe('Tripletex object id'),
      periodDateFrom: z.string().optional().describe('Archive period from, YYYY-MM-DD'),
      periodDateTo: z.string().optional().describe('Archive period to, YYYY-MM-DD'),
      ...pagingInputShape
    })
  )
  .output(
    z.object({
      objectType: documentArchiveObjectTypeSchema,
      objectId: z.number(),
      documents: z.array(documentArchiveSchema),
      ...listMetadataSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let response = await client.list(
      `${documentArchivePaths[ctx.input.objectType]}/${ctx.input.objectId}`,
      {
        ...commonParams(ctx.input),
        periodDateFrom: ctx.input.periodDateFrom,
        periodDateTo: ctx.input.periodDateTo
      },
      companyIdFor(ctx, ctx.input.companyId)
    );
    let documents = (response.values ?? []).map(mapDocumentArchive);

    return {
      output: {
        objectType: ctx.input.objectType,
        objectId: ctx.input.objectId,
        documents,
        ...listOutput(response)
      },
      message: `Found **${documents.length}** Tripletex archived document(s).`
    };
  })
  .build();

export let getDocumentContent = SlateTool.create(spec, {
  name: 'Get Document Content',
  key: 'get_document_content',
  description:
    'Download Tripletex document content by document id and return the file as a Slate attachment.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      documentId: z.number().int().positive().describe('Tripletex document id'),
      fields: pagingInputShape.fields,
      companyId: pagingInputShape.companyId
    })
  )
  .output(documentContentOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let companyId = companyIdFor(ctx, ctx.input.companyId);
    let document = mapDocument(
      await client.getValue(
        `/document/${ctx.input.documentId}`,
        { fields: ctx.input.fields },
        companyId
      )
    );
    let file = await client.downloadBinary(
      `/document/${ctx.input.documentId}/content`,
      companyId,
      {
        download: true
      }
    );
    let filename = document.fileName ?? `tripletex-document-${ctx.input.documentId}`;
    let mimeType = document.mimeType ?? file.mimeType;

    return {
      output: {
        documentId: ctx.input.documentId,
        filename,
        mimeType,
        byteLength: file.byteLength,
        attachmentCount: 1
      },
      attachments: [createBase64Attachment(file.contentBase64, mimeType)],
      message: `Downloaded Tripletex document **${ctx.input.documentId}**.`
    };
  })
  .build();

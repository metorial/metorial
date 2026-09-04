import { createBase64Attachment, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { CompaniesHouseClient } from '../lib/client';
import {
  documentIdSchema,
  documentMetadataOutputSchema,
  documentMimeTypeSchema,
  downloadedDocumentOutputSchema
} from '../lib/schemas';
import { spec } from '../spec';

let fileNameFor = (documentId: string, extension: string) => {
  let safeId = documentId.replace(/[^a-zA-Z0-9._-]+/g, '_');
  return `companies-house-${safeId}.${extension}`;
};

export let getDocumentMetadata = SlateTool.create(spec, {
  name: 'Get Document Metadata',
  key: 'get_document_metadata',
  description:
    'Get Companies House filing-document metadata and discover the available downloadable content types.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      documentId: documentIdSchema.describe(
        'Document ID returned by a filing-history item document metadata link.'
      )
    })
  )
  .output(documentMetadataOutputSchema)
  .handleInvocation(async ctx => {
    let metadata = await new CompaniesHouseClient(ctx.auth).getDocumentMetadata(
      ctx.input.documentId
    );
    let output = {
      documentId: metadata.documentId,
      availableContentTypes: metadata.availableContentTypes,
      record: metadata.record,
      ...pickDefined({
        companyNumber: metadata.companyNumber,
        createdAt: metadata.createdAt,
        updatedAt: metadata.updatedAt,
        pages: metadata.pages,
        links: metadata.links
      })
    };
    return {
      output,
      message: `Found **${metadata.availableContentTypes.length}** available content types for document **${metadata.documentId}**.`
    };
  })
  .build();

export let downloadFilingDocument = SlateTool.create(spec, {
  name: 'Download Filing Document',
  key: 'download_filing_document',
  description:
    'Download one advertised representation of a Companies House filing document as a file.',
  constraints: [
    'Maximum downloadable file size is 50 MiB. If the selected representation exceeds this limit, download it directly from Companies House or choose a smaller content type returned by get_document_metadata.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      documentId: documentIdSchema.describe(
        'Document ID returned by a filing-history item document metadata link.'
      ),
      contentType: documentMimeTypeSchema.describe(
        'Content type to download. Call get_document_metadata first and choose one of its availableContentTypes MIME types.'
      )
    })
  )
  .output(downloadedDocumentOutputSchema)
  .handleInvocation(async ctx => {
    let document = await new CompaniesHouseClient(ctx.auth).getDocumentContent(
      ctx.input.documentId,
      ctx.input.contentType
    );
    let fileName = fileNameFor(document.documentId, document.extension);
    return {
      output: {
        documentId: document.documentId,
        fileName,
        mimeType: document.mimeType,
        byteLength: document.content.length
      },
      attachments: [
        createBase64Attachment(document.content.toString('base64'), document.mimeType)
      ],
      message: `Downloaded file **${fileName}** as **${document.mimeType}**.`
    };
  })
  .build();

import { createApiServiceError, getFileUrlTool, pickDefined, SlateTool } from 'slates';
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
    'Get one advertised representation of a Companies House filing document as a downloadable file.',
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
    let document = await new CompaniesHouseClient(ctx.auth).getDocumentDownload(
      ctx.input.documentId,
      ctx.input.contentType
    );
    await ctx.addAttachment({
      type: 'url',
      url: document.url,
      mimeType: document.mimeType,
      refreshReference: { documentId: document.documentId, contentType: document.mimeType },
      refreshAt: document.refreshAt
    });

    let fileName = fileNameFor(document.documentId, document.extension);
    return {
      output: {
        documentId: document.documentId,
        fileName,
        mimeType: document.mimeType,
        ...pickDefined({ byteLength: document.byteLength })
      },
      message: `Prepared file **${fileName}** (**${document.mimeType}**) for download.`
    };
  })
  .build();

let documentReferenceSchema = z.object({
  documentId: documentIdSchema,
  contentType: documentMimeTypeSchema
});

// Companies House document links are short-lived; issue a fresh one for the same
// document representation when it is downloaded again.
export let getFileUrl = getFileUrlTool(spec, async ctx => {
  let reference = documentReferenceSchema.safeParse(ctx.input.reference);
  if (!reference.success) {
    throw createApiServiceError(
      'The filing document reference is invalid. Download the filing document again.',
      { reason: 'companies_house_document_reference_invalid' }
    );
  }

  let link = await new CompaniesHouseClient(ctx.auth).getDocumentLink(
    reference.data.documentId,
    reference.data.contentType
  );
  return { url: link.url, expiresAt: link.refreshAt, headers: {}, query: {} };
});

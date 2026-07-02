import { createBase64Attachment, SlateTool } from 'slates';
import { z } from 'zod';
import { finagoServiceError, requireInput } from '../lib/errors';
import { createClientFromContext } from '../lib/helpers';
import { getNumber, getString, isRecord } from '../lib/records';
import { spec } from '../spec';

let normalizeContentType = (value: string) => {
  let contentType = requireInput(value.trim(), 'contentType');

  if (!/^[^\s/;]+\/[^\s/;]+(?:\s*;\s*[^\s=;]+=[^\s;]+)*$/.test(contentType)) {
    throw finagoServiceError('contentType must be a valid MIME type such as application/pdf.');
  }

  return contentType;
};

let normalizeContentBase64 = (value: string) => {
  let normalized = value.replace(/\s+/g, '');

  if (!normalized) {
    throw finagoServiceError('contentBase64 must be valid non-empty base64 file bytes.');
  }

  let paddingLength = normalized.length % 4;
  if (paddingLength === 1) {
    throw finagoServiceError('contentBase64 must be valid non-empty base64 file bytes.');
  }

  let padded =
    paddingLength === 0
      ? normalized
      : normalized.padEnd(normalized.length + (4 - paddingLength), '=');

  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(padded)) {
    throw finagoServiceError('contentBase64 must be valid non-empty base64 file bytes.');
  }

  if (Buffer.from(padded, 'base64').byteLength === 0) {
    throw finagoServiceError('contentBase64 must be valid non-empty base64 file bytes.');
  }

  return padded;
};

let requireUploadUrl = (upload: unknown) => {
  let uploadUrl = getString(upload, 'uploadUrl')?.trim();
  if (!uploadUrl) {
    throw finagoServiceError('Finago did not return uploadUrl required by /fileUpload.');
  }

  try {
    let parsed = new URL(uploadUrl);
    if (parsed.protocol !== 'https:') {
      throw new TypeError('Expected https upload URL.');
    }
  } catch {
    throw finagoServiceError('Finago returned an invalid uploadUrl for /fileUpload.');
  }

  return uploadUrl;
};

let requireUploadMethod = (upload: unknown) => {
  let uploadMethod = getString(upload, 'uploadMethod')?.trim().toUpperCase();
  if (!uploadMethod) {
    throw finagoServiceError('Finago did not return uploadMethod required by /fileUpload.');
  }

  if (!/^[A-Z]+$/.test(uploadMethod)) {
    throw finagoServiceError('Finago returned an invalid uploadMethod for /fileUpload.');
  }

  return uploadMethod;
};

let requireFileId = (upload: unknown) => {
  let fileId = getString(upload, 'fileId')?.trim() ?? getNumber(upload, 'fileId')?.toString();
  if (!fileId) {
    throw finagoServiceError('Finago did not return fileId required by /fileUpload.');
  }

  return fileId;
};

export let finagoUploadTransactionFile = SlateTool.create(spec, {
  name: 'Upload Transaction File',
  key: 'finago_upload_transaction_file',
  description:
    'Upload a file for later attachment to a Finago transaction. The tool initiates the upload, uploads the provided base64 bytes to Finago’s presigned URL, and returns file metadata only.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      contentType: z.string().describe('MIME type, such as application/pdf.'),
      contentBase64: z
        .string()
        .describe('Base64-encoded file bytes to upload through the presigned URL.'),
      fileName: z
        .string()
        .optional()
        .describe(
          'Local filename for user context. Finago fileUpload only requires contentType.'
        )
    })
  )
  .output(
    z.object({
      fileId: z.string().describe('Finago file upload ID.'),
      uploadMethod: z.string().describe('HTTP method used for presigned upload.'),
      byteLength: z.number().describe('Uploaded byte length.'),
      fileName: z.string().optional().describe('Input filename.'),
      contentType: z.string().describe('Uploaded MIME type.'),
      record: z
        .unknown()
        .describe('Sanitized Finago file upload initiation response without uploadUrl.')
    })
  )
  .handleInvocation(async ctx => {
    let contentType = normalizeContentType(ctx.input.contentType);
    let contentBase64 = normalizeContentBase64(ctx.input.contentBase64);
    let client = createClientFromContext(ctx);
    let upload = await client.post(
      '/fileUpload',
      { contentType },
      undefined,
      'initiate file upload'
    );

    let uploadUrl = requireUploadUrl(upload);
    let uploadMethod = requireUploadMethod(upload);
    let fileId = requireFileId(upload);

    let uploaded = await client.putBinaryUrl({
      url: uploadUrl,
      method: uploadMethod,
      contentType,
      contentBase64
    });

    return {
      output: {
        fileId,
        uploadMethod,
        byteLength: uploaded.byteLength,
        fileName: ctx.input.fileName,
        contentType,
        record: { fileId, uploadMethod }
      },
      message: `Uploaded **${ctx.input.fileName ?? fileId}** (${uploaded.byteLength} bytes).`
    };
  })
  .build();

export let finagoGetFileUploadStatus = SlateTool.create(spec, {
  name: 'Get File Upload Status',
  key: 'finago_get_file_upload_status',
  description:
    'Check the status of a Finago file upload and retrieve the documentId once Finago finishes processing it.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      fileId: z.string().describe('Finago file upload ID.')
    })
  )
  .output(
    z.object({
      fileId: z.string().describe('Finago file upload ID.'),
      status: z.string().describe('Current Finago file upload status.'),
      documentId: z
        .number()
        .optional()
        .describe('Document ID when upload processing is complete.'),
      record: z.unknown().describe('Raw Finago file upload status response.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);
    let fileId = requireInput(ctx.input.fileId.trim(), 'fileId');
    let record = await client.get(
      `/fileUpload/${encodeURIComponent(fileId)}`,
      undefined,
      'get file upload status'
    );
    let status = getString(record, 'status');
    if (!status) {
      throw finagoServiceError('Finago did not return a file upload status.');
    }

    return {
      output: {
        fileId:
          getString(record, 'fileId') ?? getNumber(record, 'fileId')?.toString() ?? fileId,
        status,
        documentId: getNumber(record, 'documentId'),
        record
      },
      message: `Finago file upload **${fileId}** status: **${status}**.`
    };
  })
  .build();

let documentPageSchema = z.object({
  sequenceNumber: z.number().describe('Page number within the document.'),
  thumbnailUrl: z.string().describe('Presigned thumbnail URL for the page.'),
  previewUrl: z.string().describe('Presigned preview URL for the page.')
});

let requireDocumentString = (record: unknown, key: string, label: string) => {
  let value = getString(record, key)?.trim();
  if (!value) {
    throw finagoServiceError(
      `Finago did not return ${label} required by /documents/{documentId}.`
    );
  }

  return value;
};

let documentPages = (record: unknown) => {
  if (!isRecord(record) || !Array.isArray(record.pages)) return undefined;

  return record.pages.map((page, index) => {
    if (!isRecord(page)) {
      throw finagoServiceError(`Finago returned invalid page metadata at index ${index}.`);
    }

    let sequenceNumber = getNumber(page, 'sequenceNumber');
    let thumbnailUrl = getString(page, 'thumbnailUrl')?.trim();
    let previewUrl = getString(page, 'previewUrl')?.trim();
    if (sequenceNumber === undefined || !thumbnailUrl || !previewUrl) {
      throw finagoServiceError(`Finago returned invalid page metadata at index ${index}.`);
    }

    return { sequenceNumber, thumbnailUrl, previewUrl };
  });
};

export let finagoGetDocument = SlateTool.create(spec, {
  name: 'Get Document',
  key: 'finago_get_document',
  description:
    'Read Finago document metadata and optionally download the document through Slate attachments. Downloaded content is never returned inline.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      documentId: z.number().int().positive().describe('Finago document ID.'),
      download: z
        .boolean()
        .optional()
        .describe('Download the document and return it as a Slate attachment.')
    })
  )
  .output(
    z.object({
      documentId: z.number().describe('Finago document ID.'),
      contentType: z
        .string()
        .describe("MIME type from Finago document metadata, usually 'application/pdf'."),
      downloadUrl: z
        .string()
        .describe('Presigned URL returned by Finago for downloading the document.'),
      pages: z
        .array(documentPageSchema)
        .optional()
        .describe('Page preview metadata, when available.'),
      byteLength: z.number().optional(),
      attachmentCount: z.number().describe('Number of Slate attachments returned.'),
      record: z.unknown().describe('Raw Finago document metadata response.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);
    let record = await client.get(
      `/documents/${ctx.input.documentId}`,
      undefined,
      'get document'
    );
    let contentType = requireDocumentString(record, 'contentType', 'contentType');
    let downloadUrl = requireDocumentString(record, 'downloadUrl', 'downloadUrl');
    let outputDocumentId = getNumber(record, 'documentId') ?? ctx.input.documentId;
    let attachments: ReturnType<typeof createBase64Attachment>[] = [];
    let byteLength: number | undefined;

    if (ctx.input.download) {
      let downloaded = await client.downloadUrl(downloadUrl, contentType);
      byteLength = downloaded.byteLength;
      attachments.push(
        createBase64Attachment(
          downloaded.contentBase64,
          downloaded.contentType ?? contentType ?? 'application/octet-stream'
        )
      );
    }

    return {
      output: {
        documentId: outputDocumentId,
        contentType,
        downloadUrl,
        pages: documentPages(record),
        byteLength,
        attachmentCount: attachments.length,
        record
      },
      attachments,
      message: `Retrieved Finago document **${ctx.input.documentId}**${attachments.length ? ' with an attachment' : ''}.`
    };
  })
  .build();

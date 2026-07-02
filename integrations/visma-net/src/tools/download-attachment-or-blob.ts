import { createBase64Attachment, SlateTool } from 'slates';
import { z } from 'zod';
import { vismaNetServiceError } from '../lib/errors';
import {
  backgroundOperationSchema,
  blobMetadataSchema,
  mapBlobMetadata
} from '../lib/mapping';
import { vismaNetActionScopes } from '../scopes';
import { spec } from '../spec';
import { createVismaNetClient } from './context';

let backgroundModeSchema = z
  .enum(['sync', 'background'])
  .optional()
  .describe(
    'Use "background" to ask Visma to queue the request with erp-api-background=none.'
  );

type ToolContext = {
  auth: {
    token: string;
    tenantId?: string;
  };
  config: {
    tenantId: string;
  };
  input: {
    sourceType: 'attachment' | 'blob';
    attachmentId?: string;
    blobId?: string;
    fileName?: string;
    mimeType?: string;
    includeBlobMetadata?: boolean;
    backgroundMode?: 'sync' | 'background';
  };
};

let createClient = (ctx: ToolContext) => createVismaNetClient(ctx);

let requireSourceId = (ctx: ToolContext) => {
  if (ctx.input.sourceType === 'attachment') {
    if (!ctx.input.attachmentId) {
      throw vismaNetServiceError('attachmentId is required when sourceType is "attachment".');
    }
    return ctx.input.attachmentId;
  }

  if (!ctx.input.blobId) {
    throw vismaNetServiceError('blobId is required when sourceType is "blob".');
  }
  return ctx.input.blobId;
};

export let downloadAttachmentOrBlob = SlateTool.create(spec, {
  name: 'Download Attachment Or Blob',
  key: 'download_attachment_or_blob',
  description:
    'Download a Visma Net attachment or blob and return the file bytes as a Slate attachment. Use this for invoice, sales order, inventory, and document attachment references.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(vismaNetActionScopes.read)
  .input(
    z.object({
      sourceType: z
        .enum(['attachment', 'blob'])
        .describe(
          'Use "attachment" for /v1/attachment/{attachmentId}; use "blob" for /v1/blob/download/{blobId}.'
        ),
      attachmentId: z
        .string()
        .optional()
        .describe('Attachment UUID. Required when sourceType is "attachment".'),
      blobId: z.string().optional().describe('Blob UUID. Required when sourceType is "blob".'),
      fileName: z
        .string()
        .optional()
        .describe('Optional filename for the returned attachment.'),
      mimeType: z
        .string()
        .optional()
        .describe('Optional MIME type override for the attachment.'),
      includeBlobMetadata: z
        .boolean()
        .optional()
        .describe('When downloading a blob, also read /v1/blob/metadata/{blobId}.'),
      backgroundMode: backgroundModeSchema
    })
  )
  .output(
    z.object({
      sourceType: z.string(),
      attachmentId: z.string().optional(),
      blobId: z.string().optional(),
      fileName: z.string().optional(),
      mimeType: z.string().optional(),
      byteLength: z.number().optional(),
      attachmentCount: z.number(),
      blobMetadata: blobMetadataSchema.optional(),
      backgroundOperation: backgroundOperationSchema.optional()
    })
  )
  .handleInvocation(async (ctx: ToolContext) => {
    let sourceId = requireSourceId(ctx);
    let client = createClient(ctx);
    let blobMetadata =
      ctx.input.sourceType === 'blob' &&
      ctx.input.includeBlobMetadata &&
      ctx.input.backgroundMode !== 'background'
        ? mapBlobMetadata((await client.getBlobMetadata(sourceId)).data)
        : undefined;

    let result =
      ctx.input.sourceType === 'attachment'
        ? await client.downloadAttachment(sourceId, {
            backgroundMode: ctx.input.backgroundMode
          })
        : await client.downloadBlob(sourceId, { backgroundMode: ctx.input.backgroundMode });

    if (result.backgroundOperation) {
      return {
        output: {
          sourceType: ctx.input.sourceType,
          attachmentId: ctx.input.sourceType === 'attachment' ? sourceId : undefined,
          blobId: ctx.input.sourceType === 'blob' ? sourceId : undefined,
          attachmentCount: 0,
          blobMetadata,
          backgroundOperation: result.backgroundOperation
        },
        message: `Queued Visma Net ${ctx.input.sourceType} download **${sourceId}** as a background operation.`
      };
    }

    if (!result.body || result.byteLength === undefined) {
      throw vismaNetServiceError('Visma Net did not return downloadable file content.');
    }

    let mimeType = ctx.input.mimeType ?? blobMetadata?.contentType ?? result.mimeType;
    let fileName =
      ctx.input.fileName ??
      result.fileName ??
      blobMetadata?.blobName ??
      `${ctx.input.sourceType}-${sourceId}`;

    return {
      output: {
        sourceType: ctx.input.sourceType,
        attachmentId: ctx.input.sourceType === 'attachment' ? sourceId : undefined,
        blobId: ctx.input.sourceType === 'blob' ? sourceId : undefined,
        fileName,
        mimeType,
        byteLength: result.byteLength,
        attachmentCount: 1,
        blobMetadata
      },
      attachments: [createBase64Attachment(result.body, mimeType)],
      message: `Downloaded Visma Net ${ctx.input.sourceType} **${sourceId}** as an attachment.`
    };
  })
  .build();

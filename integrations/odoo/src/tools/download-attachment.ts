import { Buffer } from 'node:buffer';
import {
  buildApiServiceError,
  createApiServiceError,
  createBase64Attachment,
  getBase64ByteLength,
  SlateTool
} from 'slates';
import { z } from 'zod';
import { createClient, type OdooContext } from '../lib/helpers';
import { spec } from '../spec';

export const ODOO_MAX_ATTACHMENT_BYTES = 6 * 1024 * 1024;

const ATTACHMENT_METADATA_FIELDS = [
  'id',
  'name',
  'mimetype',
  'file_size',
  'type',
  'url',
  'checksum'
];

type OdooAttachmentRecord = Record<string, unknown> & { id: number };

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let attachmentRecordUrl = (ctx: OdooContext, attachmentId: number) => {
  let hasBoundAuthState = ctx.auth.transport !== undefined;
  let instanceUrl = hasBoundAuthState ? ctx.auth.instanceUrl : ctx.config.instanceUrl;
  let baseUrl = (instanceUrl ?? ctx.config.instanceUrl).replace(/\/+$/, '');
  return `${baseUrl}/web#id=${attachmentId}&model=ir.attachment&view_type=form`;
};

let normalizeFileName = (value: unknown, attachmentId: number) => {
  if (typeof value !== 'string') return `odoo-attachment-${attachmentId}`;

  let normalized = [...value.trim()]
    .map(character => {
      let codePoint = character.codePointAt(0) ?? 0;
      return codePoint < 32 || codePoint === 127 ? ' ' : character;
    })
    .join('');
  return normalized || `odoo-attachment-${attachmentId}`;
};

let normalizeMimeType = (value: unknown) => {
  if (typeof value !== 'string') return 'application/octet-stream';

  let normalized = value.trim();
  return normalized !== '' && !/[\r\n]/.test(normalized)
    ? normalized
    : 'application/octet-stream';
};

let optionalText = (value: unknown) =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

let invalidAttachmentContent = (message: string, reason: string) =>
  createApiServiceError(message, { reason });

export let validateAttachmentBase64 = (
  value: string,
  attachmentId: number,
  providerUrl: string
) => {
  let normalized = value.replace(/\s/g, '');
  if (normalized === '') {
    return { contentBase64: '', byteSize: 0 };
  }

  if (normalized.length % 4 === 1 || !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)) {
    throw invalidAttachmentContent(
      `Odoo attachment ${attachmentId} contains invalid file data. Open ${providerUrl} and re-upload the file, then retry.`,
      'odoo_attachment_content_invalid'
    );
  }

  let padding = normalized.endsWith('==') ? 2 : normalized.endsWith('=') ? 1 : 0;
  let estimatedByteSize = Math.floor((normalized.length * 3) / 4) - padding;
  if (estimatedByteSize > ODOO_MAX_ATTACHMENT_BYTES) {
    throw invalidAttachmentContent(
      `Odoo attachment ${attachmentId} exceeds the ${ODOO_MAX_ATTACHMENT_BYTES}-byte download limit. Open ${providerUrl} to download it directly or replace it with a smaller file.`,
      'odoo_attachment_too_large'
    );
  }

  let byteSize = getBase64ByteLength(normalized);
  let canonical = Buffer.from(normalized, 'base64').toString('base64').replace(/=+$/, '');
  if (byteSize === 0 || canonical !== normalized.replace(/=+$/, '')) {
    throw invalidAttachmentContent(
      `Odoo attachment ${attachmentId} contains invalid file data. Open ${providerUrl} and re-upload the file, then retry.`,
      'odoo_attachment_content_invalid'
    );
  }

  if (byteSize > ODOO_MAX_ATTACHMENT_BYTES) {
    throw invalidAttachmentContent(
      `Odoo attachment ${attachmentId} exceeds the ${ODOO_MAX_ATTACHMENT_BYTES}-byte download limit. Open ${providerUrl} to download it directly or replace it with a smaller file.`,
      'odoo_attachment_too_large'
    );
  }

  return { contentBase64: normalized, byteSize };
};

let requireAttachmentRecord = (
  value: unknown,
  attachmentId: number,
  providerUrl: string
): OdooAttachmentRecord => {
  if (!Array.isArray(value)) {
    throw invalidAttachmentContent(
      'Odoo returned invalid attachment data.',
      'odoo_attachment_response_invalid'
    );
  }

  if (value.length === 0) {
    throw invalidAttachmentContent(
      `Odoo attachment ${attachmentId} was not found or is not readable.`,
      'odoo_attachment_not_found'
    );
  }

  let record = value[0];
  if (
    value.length !== 1 ||
    !isRecord(record) ||
    record.id !== attachmentId ||
    !Number.isInteger(record.id)
  ) {
    throw invalidAttachmentContent(
      'Odoo returned invalid attachment data.',
      'odoo_attachment_response_invalid'
    );
  }

  let declaredSize = record.file_size;
  if (
    typeof declaredSize === 'number' &&
    Number.isFinite(declaredSize) &&
    declaredSize > ODOO_MAX_ATTACHMENT_BYTES
  ) {
    throw invalidAttachmentContent(
      `Odoo attachment ${attachmentId} exceeds the ${ODOO_MAX_ATTACHMENT_BYTES}-byte download limit. Open ${providerUrl} to download it directly or replace it with a smaller file.`,
      'odoo_attachment_too_large'
    );
  }

  return record as OdooAttachmentRecord;
};

export let downloadAttachment = SlateTool.create(spec, {
  name: 'Download Attachment',
  key: 'download_attachment',
  description:
    'Download the binary content of one Odoo attachment by ID. Returns the file separately from structured attachment metadata.',
  instructions: [
    'Use an ir.attachment record ID, not the ID of the business record that owns the attachment.',
    'Use the returned file for its contents; structured output contains metadata only.'
  ],
  constraints: [
    'URL-only attachment records do not contain downloadable file bytes and must be opened at their source URL.',
    `Downloads are limited to ${ODOO_MAX_ATTACHMENT_BYTES} decoded bytes.`
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      attachmentId: z
        .number()
        .int()
        .positive()
        .describe('Positive ir.attachment record ID to download'),
      context: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Optional Odoo context, such as {"lang":"en_US"} or {"allowed_company_ids":[1,2]}'
        )
    })
  )
  .output(
    z.object({
      id: z.number().int().positive().describe('Odoo attachment record ID'),
      fileName: z.string().min(1).describe('Attachment file name'),
      mimeType: z.string().min(1).describe('Attachment MIME type'),
      byteSize: z.number().int().nonnegative().describe('Decoded file size in bytes'),
      checksum: z.string().optional().describe('Odoo attachment checksum when available'),
      type: z.literal('binary').describe('Odoo attachment storage type')
    })
  )
  .handleInvocation(async ctx => {
    let attachmentId = ctx.input.attachmentId;
    let providerUrl = attachmentRecordUrl(ctx, attachmentId);
    // Odoo 19 JSON-2 exposes binary contents through `raw`; legacy RPC uses `datas`.
    let contentField = ctx.auth.transport === 'json2' ? 'raw' : 'datas';
    let arguments_: Record<string, unknown> = {
      fields: [...ATTACHMENT_METADATA_FIELDS, contentField],
      load: null,
      context: {
        ...(ctx.input.context ?? {}),
        bin_size: false
      }
    };

    let result: unknown;
    try {
      result = await createClient(ctx).callRecordMethod({
        model: 'ir.attachment',
        method: 'read',
        ids: [attachmentId],
        arguments: arguments_,
        legacyKeywordArguments: arguments_
      });
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Odoo',
        operation: `reading attachment ${attachmentId}`,
        reason: 'odoo_download_attachment_failed'
      });
    }

    let attachment = requireAttachmentRecord(result, attachmentId, providerUrl);
    let type = optionalText(attachment.type);
    let sourceUrl = optionalText(attachment.url);
    if (type === 'url') {
      let sourceGuidance = sourceUrl
        ? ` Download it from ${sourceUrl}, or open ${providerUrl} to update the attachment.`
        : ` Open ${providerUrl} to view or update its source URL.`;
      throw invalidAttachmentContent(
        `Odoo attachment ${attachmentId} links to an external URL and has no binary file content.${sourceGuidance}`,
        'odoo_attachment_url_only'
      );
    }

    let content = attachment[contentField];
    if (typeof content !== 'string') {
      throw invalidAttachmentContent(
        `Odoo attachment ${attachmentId} has no downloadable binary content. Open ${providerUrl} and upload a file, then retry.`,
        'odoo_attachment_content_missing'
      );
    }

    let { contentBase64, byteSize } = validateAttachmentBase64(
      content,
      attachmentId,
      providerUrl
    );
    let fileName = normalizeFileName(attachment.name, attachmentId);
    let mimeType = normalizeMimeType(attachment.mimetype);
    let checksum = optionalText(attachment.checksum);

    return {
      output: {
        id: attachmentId,
        fileName,
        mimeType,
        byteSize,
        checksum,
        type: 'binary' as const
      },
      attachments: [createBase64Attachment(contentBase64, mimeType)],
      message: `Downloaded Odoo attachment ${attachmentId} (${byteSize} bytes).`
    };
  })
  .build();

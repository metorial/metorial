import { type AttachmentRef, ChatErrors } from '@slates/adapter-chat';
import type { DiscordUploadFile } from './client';
import type { DiscordFileReference } from './mappers';
import type { DiscordApiMessage } from './types';

// Discord caps a whole request at 25 MiB.
// https://docs.discord.com/developers/reference#uploading-files
export let DISCORD_MAX_REQUEST_BYTES = 25 * 1024 * 1024;

export interface PreparedAttachments {
  files: DiscordUploadFile[];
  /** `clientReferenceId` for each new file, in upload order. */
  references: (string | undefined)[];
  /** Existing attachments to keep on an edit, as `{ id }` partial objects. */
  kept: { id: string }[];
}

let isDiscordReference = (value: unknown): value is DiscordFileReference =>
  !!value &&
  typeof value === 'object' &&
  typeof (value as DiscordFileReference).attachmentId === 'string';

let fetchPendingFile = async (
  attachment: AttachmentRef,
  action: string
): Promise<DiscordUploadFile> => {
  let source = attachment.sourceUrl;
  if (!source) {
    throw ChatErrors.inputInvalid({
      action,
      message: 'A pending attachment needs a sourceUrl to upload from.'
    });
  }

  let response: Response;
  try {
    response = await fetch(source);
  } catch (error) {
    throw ChatErrors.attachmentDownloadFailed({
      action,
      cause: error,
      message: 'Could not fetch the file from its signed upload URL.'
    });
  }

  if (!response.ok) {
    throw ChatErrors.attachmentDownloadFailed({
      action,
      message: `Could not fetch the file from its signed upload URL: HTTP ${response.status}.`
    });
  }

  let bytes = new Uint8Array(await response.arrayBuffer());
  return {
    filename: attachment.name ?? 'file',
    contentType: attachment.mimeType ?? response.headers.get('content-type') ?? undefined,
    bytes
  };
};

/**
 * Shape B uploads: pending attachments are fetched here and sent as multipart parts of
 * the same message create/edit call. Completed Discord attachments can only be kept on
 * the message that already owns them (edits); Discord cannot re-attach a file by id.
 */
export let prepareAttachments = async (
  attachments: AttachmentRef[] | undefined,
  options: { action: string; messageId?: string }
): Promise<PreparedAttachments> => {
  let prepared: PreparedAttachments = { files: [], references: [], kept: [] };

  for (let attachment of attachments ?? []) {
    if (attachment.status === 'pending') {
      prepared.files.push(await fetchPendingFile(attachment, options.action));
      prepared.references.push(attachment.clientReferenceId);
      continue;
    }

    let reference = attachment.providerFileReference;
    if (
      options.messageId &&
      isDiscordReference(reference) &&
      reference.messageId === options.messageId
    ) {
      prepared.kept.push({ id: reference.attachmentId });
      continue;
    }

    throw ChatErrors.attachmentUnsupportedType({
      action: options.action,
      attachmentId: attachment.id,
      message: options.messageId
        ? 'Only attachments already on this message, or new uploads, can be included in an edit.'
        : 'Discord cannot re-attach an existing file by reference; upload it again first.'
    });
  }

  let total = prepared.files.reduce((sum, file) => sum + file.bytes.byteLength, 0);
  if (total > DISCORD_MAX_REQUEST_BYTES) {
    throw ChatErrors.attachmentTooLarge({
      action: options.action,
      max: DISCORD_MAX_REQUEST_BYTES,
      actual: total
    });
  }

  return prepared;
};

/**
 * Correlates new attachments with the caller's `clientReferenceId`: attachments that were
 * not kept are the new uploads, matched by filename first and then by request order.
 */
export let clientReferencesFor = (
  raw: DiscordApiMessage,
  prepared: PreparedAttachments
): Map<string, string> => {
  let result = new Map<string, string>();
  let keptIds = new Set(prepared.kept.map(kept => kept.id));
  let fresh = (raw.attachments ?? []).filter(attachment => !keptIds.has(attachment.id));
  let unmatched = [...fresh];

  prepared.files.forEach((file, index) => {
    let reference = prepared.references[index];
    let byName = unmatched.findIndex(attachment => attachment.filename === file.filename);
    let position = byName >= 0 ? byName : 0;
    let attachment = unmatched[position];
    if (!attachment) return;
    unmatched.splice(position, 1);
    if (reference) result.set(attachment.id, reference);
  });

  return result;
};

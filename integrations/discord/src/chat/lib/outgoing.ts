import { type AttachmentRef, ChatErrors } from '@slates/adapter-chat';
import type { DiscordFileReference } from './files';

// Discord caps a whole request at 25 MiB.
export let DISCORD_MAX_REQUEST_BYTES = 25 * 1024 * 1024;

let isDiscordReference = (value: unknown): value is DiscordFileReference =>
  !!value &&
  typeof value === 'object' &&
  typeof (value as DiscordFileReference).attachmentId === 'string';

// Files are sent as their own messages through file upload.
export let rejectInlineAttachments = (
  attachments: AttachmentRef[] | undefined,
  action: string
) => {
  if (!attachments?.length) return;
  throw ChatErrors.capabilityUnsupported({
    action,
    capability: 'file_upload',
    message:
      'Discord sends each uploaded file as its own message. Upload files with metorial_chat$file.upload and send text separately.'
  });
};

// An edit can only keep files already on the message, as `{ id }` partial objects.
export let keptAttachments = (
  attachments: AttachmentRef[],
  options: { action: string; messageId: string }
) =>
  attachments.map(attachment => {
    let reference = attachment.providerFileReference;
    if (isDiscordReference(reference) && reference.messageId === options.messageId) {
      return { id: reference.attachmentId };
    }
    throw ChatErrors.attachmentUnsupportedType({
      action: options.action,
      attachmentId: attachment.id,
      message:
        'Only attachments already on this message can be kept in an edit. Upload new files with metorial_chat$file.upload.'
    });
  });

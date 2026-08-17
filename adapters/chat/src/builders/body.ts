import type { AttachmentRef } from '../schema/content/attachment';
import type { ChatBody } from '../schema/content/body';
import type { ChatPart } from '../schema/content/part';

export let body = (options: {
  parts: ChatPart[];
  altText?: string;
  attachments?: AttachmentRef[];
}): ChatBody => ({
  parts: options.parts,
  altText: options.altText,
  attachments: options.attachments
});

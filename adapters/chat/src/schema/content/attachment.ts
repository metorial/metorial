import { z } from 'zod';
import { rawSchema } from '../shared/raw';

export let attachmentRefSchema = z.object({
  type: z.enum(['image', 'file', 'video', 'audio']),
  id: z.string().optional(),
  name: z.string().optional(),
  mimeType: z.string().optional(),
  url: z.string().optional(),
  size: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  encoding: z.enum(['base64', 'utf-8']).optional(),
  content: z.string().optional(),
  fetchMetadata: z.record(z.string(), z.string()).optional(),
  raw: rawSchema
});

export type AttachmentRef = z.infer<typeof attachmentRefSchema>;

export let toDownloadInput = (
  attachment: AttachmentRef,
  location: { channelId?: string; messageId?: string } = {}
) => ({
  id: attachment.id,
  url: attachment.url,
  fetchMetadata: attachment.fetchMetadata,
  channelId: location.channelId,
  messageId: location.messageId
});

export let readAttachmentContent = (attachment: AttachmentRef) => {
  if (attachment.content == null) {
    throw new Error('Attachment has no downloaded content');
  }

  return {
    content: attachment.content,
    encoding: attachment.encoding ?? ('base64' as const),
    mimeType: attachment.mimeType,
    name: attachment.name
  };
};

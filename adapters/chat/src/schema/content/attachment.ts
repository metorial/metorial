import { z } from 'zod';
import { rawSchema } from '../shared/raw';

export let attachmentRefSchema = z.object({
  type: z.enum(['image', 'file', 'video', 'audio']),
  id: z.string().optional(),
  name: z.string().optional(),
  mimeType: z.string().optional(),
  size: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  providerFileReference: z.unknown().optional(),
  /**
   * Omitted, or `'complete'`, means the attachment is fully resolved (the
   * current/default behavior). `'pending'` means nothing has actually been
   * uploaded/stored anywhere yet -- see `sourceUrl`.
   */
  status: z.enum(['pending', 'complete']).optional(),
  /**
   * Populated only when `status: 'pending'`. A signed URL the receiving
   * side (a `message.send` call) should fetch to actually perform the
   * upload.
   */
  sourceUrl: z.string().url().optional(),
  /**
   * Caller-supplied correlation id that adapters should echo back on the
   * finalized attachment on a best-effort basis, so the caller can match
   * "the file I asked to upload" to "the attachment that ended up on the
   * sent message" without relying on array position.
   */
  clientReferenceId: z.string().optional(),
  raw: rawSchema
});

export type AttachmentRef = z.infer<typeof attachmentRefSchema>;

export let toDownloadInput = (attachment: AttachmentRef) => ({
  providerFileReference: attachment.providerFileReference
});

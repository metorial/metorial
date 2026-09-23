import { z } from 'zod';

export let recentFileInputSchema = z.object({
  fileId: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
  trashed: z.boolean(),
  parents: z.array(z.string()).optional(),
  webViewLink: z.string().optional(),
  modifiedTime: z.string(),
  lastModifyingUser: z
    .object({
      displayName: z.string().optional(),
      emailAddress: z.string().optional(),
      photoLink: z.string().optional(),
      permissionId: z.string().optional()
    })
    .optional()
});

export let recentFileEventId = (fileId: string, modifiedTime: string, trashed: boolean) =>
  `${fileId}-${modifiedTime}-${trashed ? 'trashed' : 'active'}`;

import { z } from 'zod';

export let snapshotSchema = z.object({
  snapshotId: z.string().describe('ID of the saved version'),
  label: z.string().optional().describe('Saved version label'),
  revn: z.number().optional().describe('File revision saved in this version'),
  version: z.number().optional().describe('File data format version'),
  createdAt: z.string().optional().describe('When the version was created'),
  modifiedAt: z.string().optional().describe('When the version was last modified'),
  createdBy: z
    .string()
    .optional()
    .describe('Whether the version was created by a user, system, or administrator'),
  profileId: z.string().optional().describe('ID of the version creator'),
  lockedBy: z.string().optional().describe('ID of the user who locked this version')
});

export let mapSnapshot = (snapshot: Record<string, any>) => ({
  snapshotId: snapshot.id,
  label: snapshot.label ?? undefined,
  revn: snapshot.revn ?? undefined,
  version: snapshot.version ?? undefined,
  createdAt: snapshot['created-at'] ?? snapshot.createdAt ?? undefined,
  modifiedAt: snapshot['modified-at'] ?? snapshot.modifiedAt ?? undefined,
  createdBy: snapshot['created-by'] ?? snapshot.createdBy ?? undefined,
  profileId: snapshot['profile-id'] ?? snapshot.profileId ?? undefined,
  lockedBy: snapshot['locked-by'] ?? snapshot.lockedBy ?? undefined
});

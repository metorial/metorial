import { createHash } from 'node:crypto';
import { googleWatchChannelSchema } from '@slates/google-push-channels';
import { parseWithServiceError } from 'slates';
import { z } from 'zod';

// 1,000 files per page at ~60 bytes of state each keeps a full folder near 300 KB.
export const DRIVE_FOLDER_MAX_CHILDREN = 5000;

export const driveFolderSelectionSchema = z.object({
  folderIds: z
    .array(z.string().trim().min(1))
    .max(100)
    .optional()
    .meta({
      title: 'Folders',
      description: `Leave empty to get an event for every file in the account. Choose up to 100 folders to only get events for the files directly inside them, not files in their subfolders; a chosen folder can hold at most ${DRIVE_FOLDER_MAX_CHILDREN.toLocaleString('en-US')} items. The list starts with the top of My Drive, folders shared with you and the top of your first few shared drives. Search to find any other folder, or paste a folder ID: the last part of its link.`
    })
});

export const driveTargetSchema = z.object({
  accountId: z.string().min(1),
  // Null watches every file in the account instead of one folder.
  folderId: z.string().min(1).nullable(),
  driveId: z.string().min(1).nullable(),
  // Non-members with an individually shared folder use their user change log.
  cursorDriveId: z.string().min(1).nullable()
});
export type DriveTarget = z.infer<typeof driveTargetSchema>;
export const driveTargetId = (target: DriveTarget) =>
  JSON.stringify([target.accountId, target.cursorDriveId, target.folderId, target.driveId]);
const driveTargetIdSchema = z.tuple([
  z.string(),
  z.string().nullable(),
  z.string().nullable(),
  z.string().nullable()
]);
export const driveTargetIdOwner = (targetId: string) => {
  let parts: unknown;
  try {
    parts = JSON.parse(targetId);
  } catch {
    return undefined;
  }
  const parsed = driveTargetIdSchema.safeParse(parts);
  return parsed.success ? { accountId: parsed.data[0], folderId: parsed.data[2] } : undefined;
};

export const driveFolderStateSchema = z.object({
  targetId: z.string().min(1),
  cursor: z.string().min(1),
  members: z.record(z.string(), z.string().regex(/^\d+$/))
});
export type DriveFolderState = z.infer<typeof driveFolderStateSchema>;
const driveOverLimitStateSchema = z.object({
  targetId: z.string().min(1),
  overLimit: z.literal(true)
});
export const driveSavedFolderStateSchema = z.union([
  driveOverLimitStateSchema,
  driveFolderStateSchema
]);
export type DriveSavedFolderState = z.infer<typeof driveSavedFolderStateSchema>;

// Earlier registrations saved the channel ID as `channelId`.
const driveChannelSchema = z.preprocess(value => {
  if (value === null || typeof value !== 'object' || !('channelId' in value)) return value;
  const { channelId, ...channel } = value;
  return { id: channelId, ...channel };
}, googleWatchChannelSchema);
export const driveChannelRegistrationSchema = z.object({
  target: driveTargetSchema,
  // The first channel is the current one; the rest are still-accepted predecessors.
  channels: z.array(driveChannelSchema).min(1)
});
export const driveRegistrationSchema = driveChannelRegistrationSchema.extend({
  initialState: driveFolderStateSchema,
  operationId: z.string().optional(),
  tokenSeed: z.string().min(1).optional()
});

export const driveFileEventSchema = z.object({
  type: z.enum(['file_added_to_folder', 'file_updated']),
  accountId: z.string().min(1),
  folderId: z
    .string()
    .min(1)
    .nullable()
    .describe('The selected folder the file is in. Null when no folders are selected.'),
  driveId: z.string().nullable(),
  cursorDriveId: z.string().nullable(),
  fileId: z.string().min(1),
  name: z.string(),
  mimeType: z.string(),
  version: z.string().regex(/^\d+$/),
  parents: z.array(z.string()),
  webViewLink: z.string().optional(),
  createdTime: z.string().optional(),
  modifiedTime: z.string().optional(),
  observedAt: z.string().datetime(),
  trashed: z
    .boolean()
    .describe(
      'True when the file is in the trash. Only reported when no folders are selected.'
    ),
  removed: z.literal(false)
});
export const driveFileOutputSchema = driveFileEventSchema.omit({ type: true });
export type DriveFileEvent = z.infer<typeof driveFileEventSchema>;
export const driveEventId = (event: DriveFileEvent) =>
  createHash('sha256')
    .update(
      JSON.stringify([
        event.accountId,
        event.cursorDriveId,
        event.folderId,
        event.fileId,
        event.version,
        event.type
      ])
    )
    .digest('hex');

export const parseDriveContract = <T extends z.ZodType>(
  schema: T,
  value: unknown,
  name: string
) =>
  parseWithServiceError(schema, value, `Invalid Google Drive ${name}.`, {
    reason: 'google_drive_trigger_contract_invalid'
  });

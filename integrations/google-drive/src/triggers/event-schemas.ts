import { createHash } from 'node:crypto';
import { googleWatchChannelSchema } from '@slates/google-push-channels';
import { parseWithServiceError } from 'slates';
import { z } from 'zod';

// One baseline page is 1,000 files; a tracked child costs about 60 bytes of saved
// state, so a full folder stays near 300 KB.
export const DRIVE_FOLDER_MAX_CHILDREN = 5000;

export const driveFolderSelectionSchema = z.object({
  folderIds: z
    .array(z.string().trim().min(1))
    .min(1)
    .max(100)
    .describe(
      `IDs of up to 100 folders to watch. Only immediate children are included; nested folder contents are excluded. Each folder can have at most ${DRIVE_FOLDER_MAX_CHILDREN.toLocaleString('en-US')} immediate children. Find folders with Search Files.`
    )
});

export const driveTargetSchema = z.object({
  accountId: z.string().min(1),
  folderId: z.string().min(1),
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
  z.string(),
  z.string().nullable()
]);
// The account and folder named by a `driveTargetId`; undefined for any other string.
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
// Saved in place of the membership map while a folder is over the child limit.
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
  folderId: z.string().min(1),
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
  trashed: z.literal(false),
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

import { SlateTrigger } from 'slates';
import { googleDriveActionScopes } from '../scopes';
import { spec } from '../spec';
import { driveEventId, driveFileEventSchema, driveFileOutputSchema } from './event-schemas';
import { driveFolderEvents } from './folder-events';

function fileTrigger(
  key: 'file_added_to_folder' | 'file_updated',
  name: string,
  description: string
) {
  return SlateTrigger.create(spec, { key, name, description })
    .triggerGroup(driveFolderEvents)
    .scopes(googleDriveActionScopes.searchFiles)
    .input(driveFileEventSchema)
    .output(driveFileOutputSchema)
    .matches(event => {
      const parsed = driveFileEventSchema.safeParse(event);
      return parsed.success && parsed.data.type === key;
    })
    .map(async ctx => {
      // Expansion read this event with the same connection after verifying its
      // account, so mapping needs no further provider call.
      const { type, ...output } = ctx.input;
      return { type, id: driveEventId(ctx.input), output };
    })
    .build();
}

export const fileAddedToFolder = fileTrigger(
  'file_added_to_folder',
  'File Added to Folder',
  'A file or folder becomes visible as an immediate child of a selected folder after activation. Includes moved, restored, and newly shared existing files. Nested folder contents are excluded.'
);
export const fileUpdated = fileTrigger(
  'file_updated',
  'File Updated',
  'A known immediate child of a selected folder has a newer Google Drive version. Includes content and metadata changes; rapid changes can be combined into the latest observed version.'
);
export { driveFolderEvents };

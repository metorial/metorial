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
    .eventAttributes(['fileId', 'mimeType', 'parents'])
    .matches(event => {
      const parsed = driveFileEventSchema.safeParse(event);
      return parsed.success && parsed.data.type === key;
    })
    .map(async ctx => {
      // Expansion already read this event on a verified connection, so mapping makes no provider call.
      const { type, ...output } = ctx.input;
      return { type, id: driveEventId(ctx.input), output };
    })
    .build();
}

export const fileAddedToFolder = fileTrigger(
  'file_added_to_folder',
  'File Added to Folder',
  'A file or folder becomes visible as an immediate child of a selected folder after activation. Includes moved, restored, and newly shared existing files. Nested folder contents are excluded. Only fires when folders are selected.'
);
export const fileUpdated = fileTrigger(
  'file_updated',
  'File Updated',
  'A file has a newer Google Drive version. With no folders selected this covers every file in the account, including new and trashed files; with folders selected, only known immediate children of those folders. Includes content and metadata changes; rapid changes can be combined into the latest observed version.'
);
export { driveFolderEvents };

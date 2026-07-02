import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { GoogleDriveClient } from '../lib/client';
import { googleDriveActionScopes } from '../scopes';
import { spec } from '../spec';

let driveUserSchema = z
  .object({
    displayName: z.string().optional(),
    emailAddress: z.string().optional(),
    photoLink: z.string().optional(),
    permissionId: z.string().optional()
  })
  .optional();

export let fileChangesTrigger = SlateTrigger.create(spec, {
  name: 'File Changes',
  key: 'file_changes',
  description:
    'Triggers when files in Google Drive are created, updated, trashed, or deleted. Detects changes across My Drive and shared drives.'
})
  .scopes(googleDriveActionScopes.fileChanges)
  .input(
    z.object({
      changeType: z.string().describe('Type of change detected'),
      fileId: z.string().optional().describe('ID of the changed file'),
      removed: z.boolean().describe('Whether the file was removed'),
      time: z.string().describe('Timestamp of the change'),
      fileName: z.string().optional(),
      mimeType: z.string().optional(),
      trashed: z.boolean().optional(),
      parents: z.array(z.string()).optional(),
      webViewLink: z.string().optional(),
      modifiedTime: z.string().optional(),
      lastModifyingUser: driveUserSchema,
      driveId: z.string().optional(),
      driveName: z.string().optional()
    })
  )
  .output(
    z.object({
      fileId: z.string().optional().describe('ID of the changed file'),
      fileName: z.string().optional().describe('Name of the changed file'),
      mimeType: z.string().optional().describe('MIME type of the file'),
      trashed: z.boolean().optional().describe('Whether the file is in trash'),
      removed: z.boolean().describe('Whether the file was permanently removed'),
      parents: z.array(z.string()).optional().describe('Parent folder IDs'),
      webViewLink: z.string().optional().describe('Link to view the file'),
      modifiedTime: z.string().optional().describe('Last modification timestamp'),
      lastModifyingUserName: z
        .string()
        .optional()
        .describe('Name of the user who last modified the file'),
      lastModifyingUserEmail: z
        .string()
        .optional()
        .describe('Email of the user who last modified the file'),
      driveId: z.string().optional().describe('ID of the shared drive (if applicable)'),
      driveName: z.string().optional().describe('Name of the shared drive (if applicable)'),
      changeTime: z.string().describe('Timestamp when the change was detected')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new GoogleDriveClient(ctx.auth.token);
      let state = ctx.state as { pageToken?: string } | null;

      let pageToken = state?.pageToken;
      if (!pageToken) {
        pageToken = await client.getStartPageToken();
        return {
          inputs: [],
          updatedState: { pageToken }
        };
      }

      let allInputs: any[] = [];
      let currentToken: string | undefined = pageToken;
      let newStartPageToken: string | undefined;

      while (currentToken) {
        let result = await client.listChanges(currentToken, { pageSize: 100 });

        for (let change of result.changes) {
          let changeType = 'file.updated';
          if (change.removed) {
            changeType = 'file.removed';
          } else if (change.file?.trashed) {
            changeType = 'file.trashed';
          }

          allInputs.push({
            changeType,
            fileId: change.fileId,
            removed: change.removed,
            time: change.time || new Date().toISOString(),
            fileName: change.file?.name,
            mimeType: change.file?.mimeType,
            trashed: change.file?.trashed,
            parents: change.file?.parents,
            webViewLink: change.file?.webViewLink,
            modifiedTime: change.file?.modifiedTime,
            lastModifyingUser: change.file?.lastModifyingUser,
            driveId: change.driveId,
            driveName: change.drive?.name
          });
        }

        if (result.newStartPageToken) {
          newStartPageToken = result.newStartPageToken;
          currentToken = undefined;
        } else {
          currentToken = result.nextPageToken;
        }
      }

      return {
        inputs: allInputs,
        updatedState: {
          pageToken: newStartPageToken || pageToken
        }
      };
    },

    handleEvent: async ctx => {
      let eventId = `${ctx.input.fileId || 'unknown'}-${ctx.input.time}-${ctx.input.changeType}`;

      return {
        type: ctx.input.changeType,
        id: eventId,
        output: {
          fileId: ctx.input.fileId,
          fileName: ctx.input.fileName,
          mimeType: ctx.input.mimeType,
          trashed: ctx.input.trashed,
          removed: ctx.input.removed,
          parents: ctx.input.parents,
          webViewLink: ctx.input.webViewLink,
          modifiedTime: ctx.input.modifiedTime,
          lastModifyingUserName: ctx.input.lastModifyingUser?.displayName,
          lastModifyingUserEmail: ctx.input.lastModifyingUser?.emailAddress,
          driveId: ctx.input.driveId,
          driveName: ctx.input.driveName,
          changeTime: ctx.input.time
        }
      };
    }
  })
  .build();

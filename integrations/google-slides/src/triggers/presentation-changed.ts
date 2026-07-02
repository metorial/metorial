import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { DriveClient } from '../lib/drive-client';
import { googleSlidesActionScopes } from '../scopes';
import { spec } from '../spec';

export let presentationChanged = SlateTrigger.create(spec, {
  name: 'Presentation Changed',
  key: 'presentation_changed',
  description:
    'Triggers when a Google Slides presentation is created or modified. Uses the Google Drive API to detect file changes by polling for recently modified presentations.'
})
  .scopes(googleSlidesActionScopes.presentationChanged)
  .input(
    z.object({
      presentationId: z.string().describe('ID of the modified presentation'),
      presentationName: z.string().describe('Name of the presentation'),
      modifiedTime: z
        .string()
        .describe('ISO timestamp of when the presentation was last modified'),
      eventType: z
        .enum(['created', 'modified'])
        .describe('Whether the presentation was newly created or modified'),
      webViewLink: z.string().optional().describe('URL to view the presentation'),
      lastModifyingUserName: z
        .string()
        .optional()
        .describe('Name of the user who last modified the presentation'),
      lastModifyingUserEmail: z
        .string()
        .optional()
        .describe('Email of the user who last modified the presentation')
    })
  )
  .output(
    z.object({
      presentationId: z.string().describe('ID of the modified presentation'),
      presentationName: z.string().describe('Name of the presentation'),
      modifiedTime: z
        .string()
        .describe('ISO timestamp of when the presentation was last modified'),
      presentationUrl: z.string().describe('URL to open the presentation'),
      lastModifyingUserName: z
        .string()
        .optional()
        .describe('Name of the user who last modified'),
      lastModifyingUserEmail: z
        .string()
        .optional()
        .describe('Email of the user who last modified')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let driveClient = new DriveClient(ctx.auth.token);

      let lastPolledAt = ctx.state?.lastPolledAt as string | undefined;
      let knownPresentationIds =
        (ctx.state?.knownPresentationIds as string[] | undefined) || [];

      let result = await driveClient.listPresentations({
        pageSize: 50,
        modifiedAfter: lastPolledAt
      });

      let files = result.files || [];
      let now = new Date().toISOString();

      let inputs = files.map((file: any) => {
        let isNew = !knownPresentationIds.includes(file.id);
        return {
          presentationId: file.id,
          presentationName: file.name,
          modifiedTime: file.modifiedTime,
          eventType: isNew ? ('created' as const) : ('modified' as const),
          webViewLink: file.webViewLink,
          lastModifyingUserName: file.lastModifyingUser?.displayName,
          lastModifyingUserEmail: file.lastModifyingUser?.emailAddress
        };
      });

      let updatedKnownIds = [
        ...new Set([...knownPresentationIds, ...files.map((f: any) => f.id)])
      ];

      return {
        inputs,
        updatedState: {
          lastPolledAt: now,
          knownPresentationIds: updatedKnownIds
        }
      };
    },

    handleEvent: async ctx => {
      let input = ctx.input;

      return {
        type: `presentation.${input.eventType}`,
        id: `${input.presentationId}-${input.modifiedTime}`,
        output: {
          presentationId: input.presentationId,
          presentationName: input.presentationName,
          modifiedTime: input.modifiedTime,
          presentationUrl:
            input.webViewLink ||
            `https://docs.google.com/presentation/d/${input.presentationId}/edit`,
          lastModifyingUserName: input.lastModifyingUserName,
          lastModifyingUserEmail: input.lastModifyingUserEmail
        }
      };
    }
  })
  .build();

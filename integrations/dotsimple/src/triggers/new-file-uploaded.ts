import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { DotSimpleClient } from '../lib/client';
import { spec } from '../spec';

export let newFileUploaded = SlateTrigger.create(spec, {
  name: 'New File Uploaded',
  key: 'new_file_uploaded',
  description: 'Triggers when a new media file is uploaded to the workspace.'
})
  .input(
    z.object({
      fileUuid: z.string().describe('UUID of the uploaded file'),
      fileId: z.number().optional().describe('Numeric ID of the file'),
      name: z.string().optional().describe('File name'),
      mimeType: z.string().optional().describe('MIME type'),
      type: z.string().optional().describe('File type (image, video)'),
      url: z.string().optional().describe('File URL'),
      createdAt: z.string().optional().describe('Upload timestamp')
    })
  )
  .output(
    z.object({
      fileUuid: z.string().describe('UUID of the uploaded file'),
      fileId: z.number().optional().describe('Numeric ID of the file'),
      name: z.string().optional().describe('File name'),
      mimeType: z.string().optional().describe('MIME type of the file'),
      type: z.string().optional().describe('File type (image, video)'),
      url: z.string().optional().describe('URL to access the file'),
      createdAt: z.string().optional().describe('When the file was uploaded')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },
    pollEvents: async ctx => {
      let client = new DotSimpleClient({
        token: ctx.auth.token,
        workspaceId: ctx.config.workspaceId
      });

      let state = ctx.state as { knownUuids?: string[] } | null;
      let knownUuids = new Set(state?.knownUuids ?? []);

      let result = await client.listMedia(1);
      let files: any[] = result?.data ?? [];

      let newFiles = files.filter((f: any) => !knownUuids.has(f.uuid));

      let allUuids = files.map((f: any) => f.uuid as string);

      return {
        inputs: newFiles.map((f: any) => ({
          fileUuid: f.uuid,
          fileId: f.id,
          name: f.name,
          mimeType: f.mime_type,
          type: f.type,
          url: f.url,
          createdAt: f.created_at
        })),
        updatedState: {
          knownUuids: allUuids
        }
      };
    },
    handleEvent: async ctx => {
      return {
        type: 'file.uploaded',
        id: ctx.input.fileUuid,
        output: {
          fileUuid: ctx.input.fileUuid,
          fileId: ctx.input.fileId,
          name: ctx.input.name,
          mimeType: ctx.input.mimeType,
          type: ctx.input.type,
          url: ctx.input.url,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();

import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { SlackClient } from '../lib/client';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';

export let newFile = SlateTrigger.create(spec, {
  name: 'New File',
  key: 'new_file',
  description:
    '[Polling fallback] Triggers when a new file is uploaded or shared in the workspace. Polls the files list for newly created files.'
})
  .scopes(slackActionScopes.fileEvents)
  .input(
    z.object({
      fileId: z.string().describe('File ID'),
      name: z.string().optional().describe('Filename'),
      title: z.string().optional().describe('File title'),
      mimetype: z.string().optional().describe('MIME type'),
      filetype: z.string().optional().describe('File type'),
      size: z.number().optional().describe('File size in bytes'),
      userId: z.string().optional().describe('Uploader user ID'),
      created: z.number().optional().describe('Creation timestamp')
    })
  )
  .output(
    z.object({
      fileId: z.string().describe('File ID'),
      name: z.string().optional().describe('Filename'),
      title: z.string().optional().describe('File title'),
      mimetype: z.string().optional().describe('MIME type'),
      filetype: z.string().optional().describe('File type'),
      size: z.number().optional().describe('File size in bytes'),
      userId: z.string().optional().describe('Uploader user ID'),
      permalink: z.string().optional().describe('Permalink to the file'),
      urlPrivate: z.string().optional().describe('Private download URL'),
      created: z.number().optional().describe('Unix timestamp when the file was created'),
      channels: z.array(z.string()).optional().describe('Channel IDs where the file is shared')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new SlackClient(ctx.auth.token);
      let state = ctx.state as { lastTs?: string } | null;
      let lastTs = state?.lastTs;

      let result = await client.listFiles({
        count: 50,
        tsFrom: lastTs
      });

      let newLastTs = lastTs;
      let inputs: Array<{
        fileId: string;
        name?: string;
        title?: string;
        mimetype?: string;
        filetype?: string;
        size?: number;
        userId?: string;
        created?: number;
      }> = [];

      for (let file of result.files) {
        let fileTs = String(file.created || file.timestamp || 0);
        if (lastTs && fileTs <= lastTs) continue;

        inputs.push({
          fileId: file.id,
          name: file.name,
          title: file.title,
          mimetype: file.mimetype,
          filetype: file.filetype,
          size: file.size,
          userId: file.user,
          created: file.created || file.timestamp
        });

        if (!newLastTs || fileTs > newLastTs) {
          newLastTs = fileTs;
        }
      }

      return {
        inputs,
        updatedState: {
          lastTs: newLastTs || lastTs
        }
      };
    },

    handleEvent: async ctx => {
      let fileDetails: any = {};
      try {
        let client = new SlackClient(ctx.auth.token);
        fileDetails = await client.getFileInfo(ctx.input.fileId);
      } catch {
        // Couldn't fetch full file details
      }

      return {
        type: 'file.created',
        id: `file-${ctx.input.fileId}`,
        output: {
          fileId: ctx.input.fileId,
          name: ctx.input.name || fileDetails.name,
          title: ctx.input.title || fileDetails.title,
          mimetype: ctx.input.mimetype || fileDetails.mimetype,
          filetype: ctx.input.filetype || fileDetails.filetype,
          size: ctx.input.size || fileDetails.size,
          userId: ctx.input.userId || fileDetails.user,
          permalink: fileDetails.permalink,
          urlPrivate: fileDetails.url_private,
          created: ctx.input.created || fileDetails.created,
          channels: fileDetails.channels
        }
      };
    }
  })
  .build();

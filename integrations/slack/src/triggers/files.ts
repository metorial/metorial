import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { SlackClient } from '../lib/client';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';
import { slackEventsTriggerGroup } from './eventsTriggerGroup';

let slackFileSharedEvent = z
  .object({
    type: z.literal('file_shared'),
    file_id: z.string().optional(),
    user_id: z.string().optional(),
    channel_id: z.string().optional(),
    event_ts: z.string().optional(),
    file: z.object({ id: z.string() }).loose().optional()
  })
  .loose();

export let newFile = SlateTrigger.create(spec, {
  name: 'New File Shared',
  key: 'new_file',
  description: 'Triggers when a file is shared in a channel, DM, or group DM.'
})
  .scopes(slackActionScopes.fileEvents)
  .triggerGroup(slackEventsTriggerGroup)
  .input(slackFileSharedEvent)
  .output(
    z.object({
      fileId: z.string().describe('File ID'),
      name: z.string().optional().describe('Filename'),
      title: z.string().optional().describe('File title'),
      mimetype: z.string().optional().describe('MIME type'),
      filetype: z.string().optional().describe('File type'),
      size: z.number().optional().describe('File size in bytes'),
      userId: z.string().optional().describe('Uploader user ID'),
      channelId: z.string().optional().describe('Channel ID the file was shared in'),
      permalink: z.string().optional().describe('Permalink to the file'),
      urlPrivate: z.string().optional().describe('Private download URL'),
      created: z.number().optional().describe('Unix timestamp when the file was created')
    })
  )
  .matches(payload => {
    let event = payload as { type?: unknown; file_id?: unknown; file?: { id?: unknown } };
    return (
      !!event &&
      event.type === 'file_shared' &&
      (typeof event.file_id === 'string' || typeof event.file?.id === 'string')
    );
  })
  .map(async ctx => {
    let event = ctx.input;
    let fileId = event.file_id ?? event.file!.id;

    let fileDetails: any = {};
    try {
      let client = new SlackClient(ctx.auth.token);
      fileDetails = await client.getFileInfo(fileId);
    } catch {
      // Best-effort enrichment; the bare file ID is still worth delivering without it.
    }

    return {
      type: 'file.shared',
      id: `file-${fileId}-${event.channel_id ?? 'unknown'}`,
      output: {
        fileId,
        name: fileDetails.name,
        title: fileDetails.title,
        mimetype: fileDetails.mimetype,
        filetype: fileDetails.filetype,
        size: fileDetails.size,
        userId: event.user_id ?? fileDetails.user,
        channelId: event.channel_id,
        permalink: fileDetails.permalink,
        urlPrivate: fileDetails.url_private,
        created: fileDetails.created
      }
    };
  })
  .build();

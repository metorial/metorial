import { Buffer } from 'node:buffer';
import { uploadFile as contract } from '@slates/adapter-chat';
import { SlackClient } from '../../lib/client';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import {
  getSlackIdentity,
  mapSlackChannel,
  mapSlackFile,
  mapSlackThread
} from '../lib/mappers';

export let chatUploadFile = contract
  .implement(spec)
  .scopes(slackActionScopes.filesWrite)
  .handleInvocation(async ctx => {
    let client = new SlackClient(ctx.auth.token);
    let content = Buffer.from(
      ctx.input.content,
      ctx.input.encoding === 'base64' ? 'base64' : 'utf8'
    );
    let raw = await client.uploadBinaryFile({
      content,
      filename: ctx.input.filename,
      contentType: ctx.input.mimeType,
      channelId: ctx.input.channelId,
      threadTs: ctx.input.threadId
    });
    let [rawChannel, identity] = await Promise.all([
      client.getConversationInfo(ctx.input.channelId).catch(() => undefined),
      getSlackIdentity(client)
    ]);
    return {
      output: {
        attachment: mapSlackFile(raw),
        channel: rawChannel ? mapSlackChannel(rawChannel, identity.team_id) : undefined,
        thread: ctx.input.threadId
          ? mapSlackThread(ctx.input.channelId, ctx.input.threadId)
          : undefined,
        raw
      },
      message: `Uploaded Slack file \`${raw.id}\`.`
    };
  })
  .build();

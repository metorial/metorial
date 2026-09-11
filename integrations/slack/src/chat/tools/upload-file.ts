import { ChatErrors, uploadFile as contract } from '@slates/adapter-chat';
import { Buffer } from 'node:buffer';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { createSlackChatClient } from '../lib/client';
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
    let client = createSlackChatClient(ctx, {
      action: contract.key,
      ambiguous: {
        invalid_arguments: 'chat.attachment.unsupported_type',
        file_too_large: 'chat.attachment.too_large'
      }
    });

    let response: Response;
    try {
      response = await fetch(ctx.input.fileUrl);
    } catch {
      throw ChatErrors.attachmentDownloadFailed({
        action: contract.key,
        message: 'Could not fetch the file from its signed upload URL.'
      });
    }

    if (!response.ok) {
      throw ChatErrors.attachmentDownloadFailed({
        action: contract.key,
        message: `Could not fetch the file from its signed upload URL: HTTP ${response.status}.`
      });
    }

    let content = Buffer.from(await response.arrayBuffer());
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
        attachment: {
          ...mapSlackFile(raw),
          clientReferenceId: ctx.input.clientReferenceId
        },
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

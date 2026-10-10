import { uploadFile as contract, fetchAttachmentSource } from '@slates/adapter-chat';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { createSlackChatClient } from '../lib/client';
import {
  getSlackIdentity,
  hydrateSlackChannel,
  mapSlackFile,
  mapSlackThread
} from '../lib/mappers';

// https://docs.slack.dev/reference/methods/files.getUploadURLExternal/
let SLACK_MAX_UPLOAD_BYTES = 1024 * 1024 * 1024;

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

    let source = await fetchAttachmentSource(ctx.input.fileUrl, {
      action: contract.key,
      attachmentId: ctx.input.clientReferenceId,
      maxBytes: SLACK_MAX_UPLOAD_BYTES
    });
    let raw = await client.uploadBinaryFile({
      content: source.bytes,
      filename: ctx.input.filename,
      contentType: ctx.input.mimeType ?? source.contentType,
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
        channel: rawChannel
          ? await hydrateSlackChannel(client, rawChannel, identity, identity.team_id)
          : undefined,
        thread: ctx.input.threadId
          ? mapSlackThread(ctx.input.channelId, ctx.input.threadId)
          : undefined,
        raw
      },
      message: `Uploaded Slack file \`${raw.id}\`.`
    };
  })
  .build();

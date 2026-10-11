import {
  ChatErrors,
  uploadFile as contract,
  fetchAttachmentSource
} from '@slates/adapter-chat';
import { spec } from '../../spec';
import {
  buildMessageResult,
  loadChannelSafe,
  resolveDiscordIdentity,
  runDiscordChatAction
} from '../lib/context';
import { DISCORD_MAX_REQUEST_BYTES } from '../lib/outgoing';

// Discord has no standalone upload, so the file is sent as its own message.
// https://docs.discord.com/developers/reference#uploading-files
export let chatUploadFile = contract
  .implement(spec)
  .authMethods(['bot_token'])
  .handleInvocation(async ctx => {
    let action = contract.key;
    let { channelId, threadId, filename, fileUrl, fileSize, clientReferenceId } = ctx.input;
    if (fileSize !== undefined && fileSize > DISCORD_MAX_REQUEST_BYTES) {
      throw ChatErrors.attachmentTooLarge({
        action,
        id: filename,
        max: DISCORD_MAX_REQUEST_BYTES,
        actual: fileSize
      });
    }

    let source = await fetchAttachmentSource(fileUrl, {
      action,
      attachmentId: filename,
      maxBytes: DISCORD_MAX_REQUEST_BYTES
    });

    let output = await runDiscordChatAction(
      ctx,
      { action, channelId, threadId, attachmentId: filename },
      async client => {
        // Threads are channels on Discord, so a thread id is the target channel.
        let identity = await resolveDiscordIdentity(client, ctx.auth);
        let raw = await client.createMessage(
          threadId ?? channelId,
          { allowed_mentions: { parse: [] } },
          [
            {
              filename,
              contentType: ctx.input.mimeType ?? source.contentType,
              bytes: source.bytes
            }
          ]
        );

        let uploaded = raw.attachments?.[0];
        let references = new Map<string, string>();
        if (uploaded && clientReferenceId) references.set(uploaded.id, clientReferenceId);
        let result = buildMessageResult(
          raw,
          await loadChannelSafe(client, raw.channel_id),
          identity,
          references
        );

        let attachment = result.message.body.attachments?.[0];
        if (!attachment) {
          throw ChatErrors.attachmentUploadFailed({
            action,
            attachmentId: filename,
            message: 'Discord did not return the uploaded file.'
          });
        }
        return { attachment, ...result };
      }
    );

    return {
      output,
      message: `Sent **${filename}** to the Discord channel as message \`${output.message.id}\`.`
    };
  })
  .build();

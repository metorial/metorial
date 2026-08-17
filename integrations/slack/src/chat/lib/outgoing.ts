import { Buffer } from 'node:buffer';
import type { AttachmentRef, ChatBody } from '@slates/adapter-chat';
import type { SlackClient } from '../../lib/client';
import type { SlackMessage } from '../../lib/types';
import { renderChatBody } from './render';

let attachmentBuffer = (attachment: AttachmentRef) => {
  if (attachment.content === undefined) return undefined;
  return attachment.encoding === 'utf-8'
    ? Buffer.from(attachment.content, 'utf8')
    : Buffer.from(attachment.content, 'base64');
};

export let uploadBodyAttachments = async (
  client: SlackClient,
  body: ChatBody,
  channelId: string,
  threadTs?: string
) => {
  let uploaded = [] as Awaited<ReturnType<SlackClient['uploadBinaryFile']>>[];
  for (let attachment of body.attachments ?? []) {
    let content = attachmentBuffer(attachment);
    if (!content) continue;
    uploaded.push(
      await client.uploadBinaryFile({
        content,
        filename: attachment.name ?? `attachment-${Date.now()}`,
        contentType: attachment.mimeType,
        channelId,
        threadTs
      })
    );
  }
  return uploaded;
};

export let sendSlackBody = async (
  client: SlackClient,
  body: ChatBody,
  params: {
    channelId: string;
    threadTs?: string;
    ephemeralUserId?: string;
  }
): Promise<SlackMessage> => {
  await uploadBodyAttachments(client, body, params.channelId, params.threadTs);
  let rendered = renderChatBody(body);
  if (params.ephemeralUserId) {
    let ts = await client.postEphemeral({
      channel: params.channelId,
      user: params.ephemeralUserId,
      threadTs: params.threadTs,
      text: rendered.text,
      blocks: rendered.blocks
    });
    return {
      ts,
      channel: params.channelId,
      thread_ts: params.threadTs,
      text: rendered.text,
      blocks: rendered.blocks
    };
  }
  return client.postMessage({
    channel: params.channelId,
    threadTs: params.threadTs,
    text: rendered.text,
    blocks: rendered.blocks,
    unfurlLinks: true,
    unfurlMedia: true
  });
};

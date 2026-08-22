import type { ChatBody } from '@slates/adapter-chat';
import type { SlackClient } from '../../lib/client';
import type { SlackMessage } from '../../lib/types';
import { renderChatBody } from './render';

export let sendSlackBody = async (
  client: SlackClient,
  body: ChatBody,
  params: {
    channelId: string;
    threadTs?: string;
    ephemeralUserId?: string;
  }
): Promise<SlackMessage> => {
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

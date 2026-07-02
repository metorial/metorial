import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newMessage = SlateTrigger.create(spec, {
  name: 'New Message',
  key: 'new_message',
  description:
    '[Polling fallback] Triggered when new incoming messages are received. Polls the messages inbox for new messages since the last check.'
})
  .input(
    z.object({
      messageUuid: z.string().describe('UUID of the message'),
      contactUuid: z.string().describe('UUID of the contact'),
      contactName: z.string().nullable().describe('Name of the contact'),
      urn: z.string().describe('URN of the message sender'),
      direction: z.string().describe('Direction of the message'),
      text: z.string().describe('Text content of the message'),
      attachments: z.array(z.string()).describe('Attachments on the message'),
      channelUuid: z.string().nullable().describe('UUID of the channel'),
      channelName: z.string().nullable().describe('Name of the channel'),
      createdOn: z.string().describe('When the message was created')
    })
  )
  .output(
    z.object({
      messageUuid: z.string().describe('UUID of the message'),
      contactUuid: z.string().describe('UUID of the contact'),
      contactName: z.string().nullable().describe('Name of the contact'),
      urn: z.string().describe('URN of the message sender'),
      direction: z.string().describe('Direction of the message (incoming/outgoing)'),
      text: z.string().describe('Text content of the message'),
      attachments: z.array(z.string()).describe('Attachments on the message'),
      channelUuid: z.string().nullable().describe('UUID of the channel'),
      channelName: z.string().nullable().describe('Name of the channel'),
      createdOn: z.string().describe('When the message was created')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client(ctx.auth.token);
      let state = ctx.state as { lastPollTime?: string } | undefined;

      let params: { folder: 'inbox'; after?: string } = {
        folder: 'inbox'
      };

      if (state?.lastPollTime) {
        params.after = state.lastPollTime;
      }

      let result = await client.listMessages(params);

      let inputs = result.results.map(m => ({
        messageUuid: m.uuid,
        contactUuid: m.contact.uuid,
        contactName: m.contact.name,
        urn: m.urn,
        direction: m.direction,
        text: m.text,
        attachments: m.attachments,
        channelUuid: m.channel?.uuid || null,
        channelName: m.channel?.name || null,
        createdOn: m.created_on
      }));

      let newLastPollTime =
        result.results.length > 0 ? result.results[0]!.created_on : state?.lastPollTime;

      return {
        inputs,
        updatedState: {
          lastPollTime: newLastPollTime
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'message.received',
        id: ctx.input.messageUuid,
        output: {
          messageUuid: ctx.input.messageUuid,
          contactUuid: ctx.input.contactUuid,
          contactName: ctx.input.contactName,
          urn: ctx.input.urn,
          direction: ctx.input.direction,
          text: ctx.input.text,
          attachments: ctx.input.attachments,
          channelUuid: ctx.input.channelUuid,
          channelName: ctx.input.channelName,
          createdOn: ctx.input.createdOn
        }
      };
    }
  })
  .build();

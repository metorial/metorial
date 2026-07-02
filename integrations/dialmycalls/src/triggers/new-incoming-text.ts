import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newIncomingText = SlateTrigger.create(spec, {
  name: 'New Incoming Text',
  key: 'new_incoming_text',
  description:
    'Triggers when a new inbound text message is received on your vanity numbers or keywords.'
})
  .input(
    z.object({
      incomingTextId: z.string().describe('Unique ID of the incoming text.'),
      fromNumber: z.string().optional().describe('Sender phone number.'),
      toNumber: z.string().optional().describe('Recipient phone number (your vanity number).'),
      message: z.string().optional().describe('Text message content.'),
      createdAt: z.string().optional().describe('When the text was received.')
    })
  )
  .output(
    z.object({
      incomingTextId: z.string().describe('Unique ID of the incoming text.'),
      fromNumber: z.string().optional().describe('Sender phone number.'),
      toNumber: z.string().optional().describe('Recipient phone number (your vanity number).'),
      message: z.string().optional().describe('Text message content.'),
      createdAt: z.string().optional().describe('When the text was received.')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let texts = await client.listIncomingTexts();

      let lastSeenId = ctx.state?.lastSeenId as string | undefined;
      let lastSeenCreatedAt = ctx.state?.lastSeenCreatedAt as string | undefined;

      let newTexts = texts.filter(t => {
        if (!t.id) return false;
        if (lastSeenCreatedAt && t.created_at && t.created_at <= lastSeenCreatedAt) {
          return t.created_at === lastSeenCreatedAt && t.id !== lastSeenId;
        }
        return (
          !lastSeenCreatedAt || (t.created_at != null && t.created_at > lastSeenCreatedAt)
        );
      });

      let updatedLastSeenId = lastSeenId;
      let updatedLastSeenCreatedAt = lastSeenCreatedAt;

      if (newTexts.length > 0) {
        let newest = newTexts.reduce((latest, t) => {
          if (!latest.created_at) return t;
          if (!t.created_at) return latest;
          return t.created_at > latest.created_at ? t : latest;
        }, newTexts[0]!);
        updatedLastSeenId = newest.id;
        updatedLastSeenCreatedAt = newest.created_at;
      }

      return {
        inputs: newTexts.map(t => ({
          incomingTextId: t.id!,
          fromNumber: t.from_number,
          toNumber: t.to_number,
          message: t.message,
          createdAt: t.created_at
        })),
        updatedState: {
          lastSeenId: updatedLastSeenId,
          lastSeenCreatedAt: updatedLastSeenCreatedAt
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'incoming_text.received',
        id: ctx.input.incomingTextId,
        output: {
          incomingTextId: ctx.input.incomingTextId,
          fromNumber: ctx.input.fromNumber,
          toNumber: ctx.input.toNumber,
          message: ctx.input.message,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();

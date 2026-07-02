import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newReply = SlateTrigger.create(spec, {
  name: 'New Reply',
  key: 'new_reply',
  description:
    'Triggers when a contact replies to a campaign send. Replies are classified as optIn, optOut, or unknown.'
})
  .input(
    z.object({
      replyId: z.string().describe('Unique ID of the reply'),
      msisdn: z.string().describe('Cell number of the replying contact'),
      message: z.string().describe('Reply message content'),
      kind: z.string().describe('Reply classification: optIn, optOut, or unknown'),
      campaignId: z.string().optional().describe('Campaign ID the reply is associated with'),
      userReference: z.string().optional().describe('Send log reference'),
      received: z.string().describe('ISO 8601 timestamp when the reply was received')
    })
  )
  .output(
    z.object({
      replyId: z.string().describe('Unique ID of the reply'),
      msisdn: z.string().describe('Cell number of the replying contact'),
      message: z.string().describe('Reply message content'),
      kind: z.string().describe('Reply classification: optIn, optOut, or unknown'),
      campaignId: z.string().optional().describe('Campaign ID the reply is associated with'),
      userReference: z.string().optional().describe('Send log reference'),
      received: z.string().describe('Timestamp when the reply was received')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let lastPolledAt = (ctx.input as any).state?.lastPolledAt as string | undefined;

      let received: { $gte?: string; $lte?: string } | undefined;
      if (lastPolledAt) {
        received = { $gte: lastPolledAt };
      }

      let result = await client.searchReplies({ received });
      let replies: any[] = Array.isArray(result.data) ? result.data : [];

      let now = new Date().toISOString();

      let inputs = replies.map((reply: any) => ({
        replyId: reply._id,
        msisdn: reply.Msisdn ?? '',
        message: reply.Message ?? '',
        kind: reply.kind ?? 'unknown',
        campaignId: reply.campaign_id,
        userReference: reply.UserReference,
        received: reply.Received ?? now
      }));

      return {
        inputs,
        updatedState: {
          lastPolledAt: now
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `reply.${ctx.input.kind}`,
        id: ctx.input.replyId,
        output: {
          replyId: ctx.input.replyId,
          msisdn: ctx.input.msisdn,
          message: ctx.input.message,
          kind: ctx.input.kind,
          campaignId: ctx.input.campaignId,
          userReference: ctx.input.userReference,
          received: ctx.input.received
        }
      };
    }
  })
  .build();

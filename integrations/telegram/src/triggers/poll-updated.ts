import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { TelegramClient } from '../lib/client';
import { generateSecretToken, verifySecretToken } from '../lib/webhook-utils';
import { spec } from '../spec';

let pollOptionSchema = z.object({
  text: z.string().describe('Option text'),
  voterCount: z.number().describe('Number of voters for this option')
});

export let pollUpdatedTrigger = SlateTrigger.create(spec, {
  name: 'Poll Updated',
  key: 'poll_updated',
  description:
    'Triggers when a poll state changes (stopped polls or polls sent by the bot) or when a user changes their answer in a non-anonymous poll.'
})
  .input(
    z.object({
      updateId: z.number().describe('Unique update identifier'),
      eventType: z.string().describe('Type of poll event'),
      pollData: z.any().describe('Raw poll or poll_answer object')
    })
  )
  .output(
    z.object({
      pollId: z.string().describe('Unique poll identifier'),
      question: z.string().optional().describe('Poll question (poll event only)'),
      options: z
        .array(pollOptionSchema)
        .optional()
        .describe('Poll options with vote counts (poll event only)'),
      totalVoterCount: z
        .number()
        .optional()
        .describe('Total number of voters (poll event only)'),
      isClosed: z
        .boolean()
        .optional()
        .describe('Whether the poll is closed (poll event only)'),
      isAnonymous: z
        .boolean()
        .optional()
        .describe('Whether the poll is anonymous (poll event only)'),
      pollType: z.string().optional().describe('Poll type: regular or quiz (poll event only)'),
      voterUserId: z.number().optional().describe('User ID of the voter (poll_answer only)'),
      voterFirstName: z
        .string()
        .optional()
        .describe('First name of the voter (poll_answer only)'),
      selectedOptionIds: z
        .array(z.number())
        .optional()
        .describe(
          '0-based indices of selected options (poll_answer only, empty if vote retracted)'
        )
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new TelegramClient(ctx.auth.token);
      let secretToken = generateSecretToken();

      await client.setWebhook({
        url: ctx.input.webhookBaseUrl,
        allowedUpdates: ['poll', 'poll_answer'],
        secretToken
      });

      return {
        registrationDetails: { secretToken }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new TelegramClient(ctx.auth.token);
      await client.deleteWebhook();
    },

    handleRequest: async ctx => {
      let registrationDetails = ctx.state?.registrationDetails;
      if (registrationDetails?.secretToken) {
        if (!verifySecretToken(ctx.request, registrationDetails.secretToken)) {
          return { inputs: [] };
        }
      }

      let data = (await ctx.request.json()) as any;
      let inputs: Array<{ updateId: number; eventType: string; pollData: any }> = [];

      if (data.poll) {
        inputs.push({ updateId: data.update_id, eventType: 'poll', pollData: data.poll });
      } else if (data.poll_answer) {
        inputs.push({
          updateId: data.update_id,
          eventType: 'poll_answer',
          pollData: data.poll_answer
        });
      }

      return { inputs };
    },

    handleEvent: async ctx => {
      let d = ctx.input.pollData;
      let isPollState = ctx.input.eventType === 'poll';

      return {
        type: `poll.${ctx.input.eventType}`,
        id: `${ctx.input.updateId}`,
        output: {
          pollId: isPollState ? d.id : d.poll_id,
          question: isPollState ? d.question : undefined,
          options: isPollState
            ? d.options.map((o: any) => ({ text: o.text, voterCount: o.voter_count }))
            : undefined,
          totalVoterCount: isPollState ? d.total_voter_count : undefined,
          isClosed: isPollState ? d.is_closed : undefined,
          isAnonymous: isPollState ? d.is_anonymous : undefined,
          pollType: isPollState ? d.type : undefined,
          voterUserId: !isPollState ? d.user?.id : undefined,
          voterFirstName: !isPollState ? d.user?.first_name : undefined,
          selectedOptionIds: !isPollState ? d.option_ids : undefined
        }
      };
    }
  })
  .build();

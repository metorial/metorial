import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let participateInPollTool = SlateTool.create(spec, {
  name: 'Participate in Poll',
  key: 'participate_in_poll',
  description: `Add a participant's vote to a Doodle poll. Each preference value corresponds to a poll option in order: **0** = No, **1** = Yes, **2** = If need be (when enabled).
Retrieve the poll first to see available options and their order.`,
  instructions: [
    'The preferences array must have the same length as the number of options in the poll.',
    'Use 0 for "No", 1 for "Yes", 2 for "If need be" (only when the poll has ifNeedBe enabled).',
    'Retrieve the poll first with Get Poll to see available options and their order.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      pollId: z.string().describe('The poll to participate in'),
      participantName: z.string().describe('Name of the participant'),
      participantEmail: z
        .string()
        .optional()
        .describe('Email of the participant (required if poll has askEmail enabled)'),
      preferences: z
        .array(z.number())
        .describe('Voting preferences for each option in order (0=no, 1=yes, 2=if need be)')
    })
  )
  .output(
    z.object({
      participantId: z.string().describe('Unique identifier of the newly added participant'),
      participantName: z.string().describe('Name of the participant'),
      preferences: z.array(z.number()).describe('The submitted preferences')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let participant = await client.addParticipant(ctx.input.pollId, {
      name: ctx.input.participantName,
      email: ctx.input.participantEmail,
      preferences: ctx.input.preferences
    });

    return {
      output: {
        participantId: participant.participantId,
        participantName: participant.name,
        preferences: participant.preferences
      },
      message: `Added participant **${participant.name}** to poll \`${ctx.input.pollId}\`.`
    };
  })
  .build();

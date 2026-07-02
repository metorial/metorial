import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let removeParticipantTool = SlateTool.create(spec, {
  name: 'Remove Participant',
  key: 'remove_participant',
  description: `Remove a participant and their votes from a Doodle poll. Requires the poll's admin key for authorization.`,
  instructions: [
    'Use Get Poll to find the participant ID you want to remove.',
    'The admin key is required and was returned when the poll was created.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      pollId: z.string().describe('The poll to remove the participant from'),
      participantId: z.string().describe('The ID of the participant to remove'),
      adminKey: z.string().describe('The admin key for the poll')
    })
  )
  .output(
    z.object({
      removed: z.boolean().describe('Whether the participant was successfully removed'),
      pollId: z.string().describe('The poll the participant was removed from'),
      participantId: z.string().describe('The ID of the removed participant')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteParticipant(
      ctx.input.pollId,
      ctx.input.participantId,
      ctx.input.adminKey
    );

    return {
      output: {
        removed: true,
        pollId: ctx.input.pollId,
        participantId: ctx.input.participantId
      },
      message: `Removed participant \`${ctx.input.participantId}\` from poll \`${ctx.input.pollId}\`.`
    };
  })
  .build();

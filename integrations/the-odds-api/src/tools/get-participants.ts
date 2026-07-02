import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getParticipantsTool = SlateTool.create(spec, {
  name: 'Get Participants',
  key: 'get_participants',
  description: `Retrieve a list of known participants (teams or individual players) for a given sport. Useful for building reference data and mapping team/player names.`,
  constraints: ['Costs 1 API credit.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sport: z.string().describe('Sport key (e.g. "americanfootball_nfl")')
    })
  )
  .output(
    z.object({
      participants: z.array(
        z.object({
          participantId: z.string().describe('Unique participant identifier'),
          fullName: z.string().describe('Full name of the team or player')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.getParticipants(ctx.input.sport);

    let participants = data.map(p => ({
      participantId: p.id,
      fullName: p.full_name
    }));

    return {
      output: { participants },
      message: `Found **${participants.length}** participants for **${ctx.input.sport}**.`
    };
  })
  .build();

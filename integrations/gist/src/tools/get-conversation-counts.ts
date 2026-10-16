import { SlateTool } from 'slates';
import { z } from 'zod';
import { GistClient } from '../lib/client';
import { spec } from '../spec';

export let getConversationCounts = SlateTool.create(spec, {
  name: 'Get Conversation Counts',
  key: 'get_conversation_counts',
  description: `Get conversation counts globally, per team, or per teammate. Useful for monitoring workload and queue sizes.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      scope: z
        .enum(['global', 'teams', 'teammates'])
        .describe('Scope of the count: global, by teams, or by teammates')
    })
  )
  .output(
    z.object({
      rawResponse: z.any().optional().describe('Complete provider response data'),
      counts: z.any().describe('Conversation count data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GistClient({ token: ctx.auth.token });

    switch (ctx.input.scope) {
      case 'global':
        await client.getConversationCountsGlobal();
        break;
      case 'teams':
        await client.getConversationCountsTeams();
        break;
      case 'teammates':
        await client.getConversationCountsTeammates();
        break;
    }

    return {
      output: {
        rawResponse: client.responses,
        counts: client.responses[client.responses.length - 1]
      },
      message: `Retrieved **${ctx.input.scope}** conversation counts.`
    };
  })
  .build();

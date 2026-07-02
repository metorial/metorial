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
      counts: z.any().describe('Conversation count data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GistClient({ token: ctx.auth.token });

    let data: any;
    switch (ctx.input.scope) {
      case 'global':
        data = await client.getConversationCountsGlobal();
        break;
      case 'teams':
        data = await client.getConversationCountsTeams();
        break;
      case 'teammates':
        data = await client.getConversationCountsTeammates();
        break;
    }

    return {
      output: { counts: data },
      message: `Retrieved **${ctx.input.scope}** conversation counts.`
    };
  })
  .build();

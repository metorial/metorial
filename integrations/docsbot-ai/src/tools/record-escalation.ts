import { SlateTool } from 'slates';
import { z } from 'zod';
import { DocsBotChatClient } from '../lib/client';
import { resolveTeamId, teamIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let recordEscalation = SlateTool.create(spec, {
  name: 'Record Escalation',
  key: 'record_escalation',
  description: `Mark an individual answer in question history as escalated to human support. This records question-level escalation and does not confirm escalation of a whole conversation. Call list_teams to discover accessible team IDs.`
})
  .input(
    z.object({
      teamId: teamIdSchema,
      botId: z.string().describe('Bot ID that generated the answer'),
      answerId: z.string().describe('Answer ID to mark as escalated')
    })
  )
  .output(
    z.object({
      escalated: z.boolean().describe('Whether the escalation was successfully recorded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DocsBotChatClient(ctx.auth.token);
    await client.recordEscalation(
      resolveTeamId(ctx.input.teamId, ctx.config.teamId),
      ctx.input.botId,
      ctx.input.answerId
    );

    return {
      output: { escalated: true },
      message: `Recorded escalation for answer \`${ctx.input.answerId}\``
    };
  })
  .build();

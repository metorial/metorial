import { SlateTool } from 'slates';
import { z } from 'zod';
import { DocsBotChatClient } from '../lib/client';
import { spec } from '../spec';

export let recordEscalation = SlateTool.create(spec, {
  name: 'Record Escalation',
  key: 'record_escalation',
  description: `Record that a chat interaction was escalated to human support. Call this when a user requests human assistance during a bot conversation.`
})
  .input(
    z.object({
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
    await client.recordEscalation(ctx.config.teamId, ctx.input.botId, ctx.input.answerId);

    return {
      output: { escalated: true },
      message: `Recorded escalation for answer \`${ctx.input.answerId}\``
    };
  })
  .build();

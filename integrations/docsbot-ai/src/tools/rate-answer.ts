import { SlateTool } from 'slates';
import { z } from 'zod';
import { DocsBotChatClient } from '../lib/client';
import { spec } from '../spec';

export let rateAnswer = SlateTool.create(spec, {
  name: 'Rate Answer',
  key: 'rate_answer',
  description: `Rate a bot's answer as positive, negative, or neutral (reset). Use the answerId from a chat response to submit the rating. Also supports recording a human support escalation for a given answer.`
})
  .input(
    z.object({
      botId: z.string().describe('Bot ID that generated the answer'),
      answerId: z.string().describe('Answer ID to rate (from the chat response)'),
      rating: z
        .enum(['positive', 'negative', 'neutral'])
        .describe('Rating: positive (1), negative (-1), or neutral to reset (0)')
    })
  )
  .output(
    z.object({
      rated: z.boolean().describe('Whether the rating was successfully recorded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DocsBotChatClient(ctx.auth.token);
    let ratingValue =
      ctx.input.rating === 'positive' ? 1 : ctx.input.rating === 'negative' ? -1 : 0;

    await client.rateAnswer(
      ctx.config.teamId,
      ctx.input.botId,
      ctx.input.answerId,
      ratingValue
    );

    return {
      output: { rated: true },
      message: `Rated answer \`${ctx.input.answerId}\` as **${ctx.input.rating}**`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { DocsBotAdminClient } from '../lib/client';
import { spec } from '../spec';

export let deleteQuestion = SlateTool.create(spec, {
  name: 'Delete Question',
  key: 'delete_question',
  description: `Soft-delete a question from the bot's question history. The question is flagged as deleted and its content is cleared.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      botId: z.string().describe('Bot ID the question belongs to'),
      questionId: z.string().describe('Question ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the question was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DocsBotAdminClient(ctx.auth.token);
    await client.deleteQuestion(ctx.config.teamId, ctx.input.botId, ctx.input.questionId);

    return {
      output: { deleted: true },
      message: `Deleted question \`${ctx.input.questionId}\``
    };
  })
  .build();

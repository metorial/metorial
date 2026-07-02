import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let deleteArticle = SlateTool.create(spec, {
  name: 'Delete Article',
  key: 'delete_article',
  description: `Permanently delete a knowledge base article by ID. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      articleId: z.string().describe('ID of the article to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the article was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deleteArticle(ctx.input.articleId);

    return {
      output: { deleted: true },
      message: `Deleted article **${ctx.input.articleId}**`
    };
  })
  .build();

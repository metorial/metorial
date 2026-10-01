import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../../../spec';
import { createClient } from '../lib/helpers';

export let deleteArticle = SlateTool.create(spec, {
  name: 'Desk Delete Article',
  key: 'desk_delete_article',
  description: `Permanently delete a knowledge base article by ID. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      orgId: z
        .string()
        .optional()
        .describe('Organization ID. Call desk_list_organizations to discover IDs.'),
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

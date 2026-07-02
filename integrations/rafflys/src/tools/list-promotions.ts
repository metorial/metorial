import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPromotionsTool = SlateTool.create(spec, {
  name: 'List Promotions',
  key: 'list_promotions',
  description: `List all promotions (giveaways, contests, fortune wheels) in your Rafflys account. Returns each promotion's ID and name. Useful for discovering available promotions before fetching their leads.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      promotions: z
        .array(
          z.object({
            promotionId: z.string().describe('Unique identifier of the promotion'),
            name: z.string().describe('Name of the promotion')
          })
        )
        .describe('List of promotions in the account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let promotions = await client.listPromotions();

    let mapped = promotions.map(p => ({
      promotionId: p.id?.toString(),
      name: p.name
    }));

    return {
      output: {
        promotions: mapped
      },
      message: `Found **${mapped.length}** promotion(s).`
    };
  })
  .build();

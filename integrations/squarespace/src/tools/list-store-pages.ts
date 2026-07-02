import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listStorePages = SlateTool.create(spec, {
  name: 'List Store Pages',
  key: 'list_store_pages',
  description: `Retrieve all Store Pages (product collections) from a Squarespace site. Store pages are required when creating new products — each product belongs to exactly one store page.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      storePages: z.array(z.any()).describe('Array of store page objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let storePages = await client.listStorePages();

    return {
      output: {
        storePages
      },
      message: `Retrieved **${storePages.length}** store page(s).`
    };
  })
  .build();

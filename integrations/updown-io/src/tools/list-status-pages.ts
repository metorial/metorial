import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { statusPageSchema } from '../lib/types';
import { spec } from '../spec';

export let listStatusPages = SlateTool.create(spec, {
  name: 'List Status Pages',
  key: 'list_status_pages',
  description: `List all status pages configured in your account. Status pages aggregate multiple checks into a single public or private view.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      statusPages: z.array(statusPageSchema).describe('List of all status pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let statusPages = await client.listStatusPages();

    return {
      output: { statusPages },
      message: `Found **${statusPages.length}** status page(s).`
    };
  })
  .build();

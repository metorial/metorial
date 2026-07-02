import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCategories = SlateTool.create(spec, {
  name: 'List Categories',
  key: 'list_categories',
  description: `Lists all available content filtering categories (36+ categories). Use the returned category IDs when configuring policy blocking rules. Also supports listing application categories and individual applications (AppAware, 400+ SaaS apps).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      type: z
        .enum(['content', 'application', 'application_category'])
        .default('content')
        .describe(
          '"content" for filtering categories, "application" for AppAware apps, "application_category" for app categories'
        )
    })
  )
  .output(
    z.object({
      items: z
        .array(z.record(z.string(), z.any()))
        .describe('List of category or application objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let items: any;
    if (ctx.input.type === 'application') {
      items = await client.listApplications();
    } else if (ctx.input.type === 'application_category') {
      items = await client.listApplicationCategories();
    } else {
      items = await client.listCategories();
    }

    return {
      output: { items },
      message: `Found **${items.length}** ${ctx.input.type} item(s).`
    };
  })
  .build();

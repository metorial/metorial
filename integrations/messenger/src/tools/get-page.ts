import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createMessengerClient } from '../lib/client';
import { spec } from '../spec';

export let getPage = SlateTool.create(spec, {
  name: 'Get Connected Page',
  key: 'get_page',
  description: `Get the Facebook Page this Messenger connection sends as: its Page ID, name, link, and picture.`,
  constraints: [
    'The name, link, and picture need the pages_read_engagement permission; without it only the Page ID is returned.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      pageId: z.string().describe('Facebook Page ID'),
      name: z.string().optional().describe('Page name'),
      link: z.string().optional().describe('Link to the Page on Facebook'),
      pictureUrl: z.string().optional().describe('Page profile picture URL'),
      detailsAvailable: z
        .boolean()
        .describe(
          'False when the connection may not read Page details and only the ID is known'
        )
    })
  )
  .handleInvocation(async ctx => {
    let page = await createMessengerClient(ctx).getPage();

    return {
      output: page,
      message: page.name
        ? `Connected to Facebook Page **${page.name}** (${page.pageId}).`
        : `Connected to Facebook Page \`${page.pageId}\`.`
    };
  })
  .build();

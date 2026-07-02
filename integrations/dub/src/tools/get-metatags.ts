import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getMetatags = SlateTool.create(spec, {
  name: 'Get Metatags',
  key: 'get_metatags',
  description: `Retrieve Open Graph metadata (title, description, image) for any URL. Useful for generating link previews or populating social media card fields when creating links.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('The URL to retrieve metatags for')
    })
  )
  .output(
    z.object({
      title: z.string().nullable().describe('The meta title tag'),
      description: z.string().nullable().describe('The meta description tag'),
      image: z.string().nullable().describe('The meta image (OG image) URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let metatags = await client.getMetatags(ctx.input.url);

    return {
      output: {
        title: metatags.title,
        description: metatags.description,
        image: metatags.image
      },
      message: metatags.title
        ? `Retrieved metatags for **${metatags.title}**`
        : `Retrieved metatags for \`${ctx.input.url}\``
    };
  })
  .build();

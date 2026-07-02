import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let mapWebsite = SlateTool.create(spec, {
  name: 'Map Website URLs',
  key: 'map_website',
  description: `Scan a website and discover all URLs found on it. Useful for creating a sitemap, understanding site structure, or preparing a list of pages to crawl.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('URL of the website to map')
    })
  )
  .output(
    z.object({
      urls: z.array(z.string()).describe('List of all URLs found on the website')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.mapWebsite({ url: ctx.input.url });

    let urls = result.urls ?? result;
    let urlList = Array.isArray(urls) ? urls : [];

    return {
      output: {
        urls: urlList
      },
      message: `Mapped **${urlList.length}** URLs on ${ctx.input.url}.`
    };
  })
  .build();

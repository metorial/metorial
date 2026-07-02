import { SlateTool } from 'slates';
import { z } from 'zod';
import { PrerenderClient } from '../lib/client';
import { spec } from '../spec';

export let renderPage = SlateTool.create(spec, {
  name: 'Render Page',
  key: 'render_page',
  description: `Render a URL through Prerender's headless browser and retrieve the fully rendered HTML. This uses the core rendering service endpoint to produce a pre-rendered HTML snapshot of a JavaScript-heavy page.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('The full URL to render (e.g. "https://example.com/page").')
    })
  )
  .output(
    z.object({
      renderedHtml: z.string().describe('The fully rendered HTML content of the page.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PrerenderClient({ token: ctx.auth.token });

    let html = await client.renderPage(ctx.input.url);

    return {
      output: {
        renderedHtml: html
      },
      message: `Rendered page **${ctx.input.url}** (${html.length} characters of HTML).`
    };
  })
  .build();

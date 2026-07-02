import { SlateTool } from 'slates';
import { z } from 'zod';
import { PiloterrClient } from '../lib/client';
import { spec } from '../spec';

export let screenshotWebpage = SlateTool.create(spec, {
  name: 'Screenshot Webpage',
  key: 'screenshot_webpage',
  description: `Capture a high-quality screenshot of any webpage. Returns the screenshot image data from a simple URL input.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('Full URL of the webpage to screenshot')
    })
  )
  .output(
    z.object({
      screenshotData: z.any().describe('Screenshot image data or URL returned by the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PiloterrClient(ctx.auth.token);
    let result = await client.screenshotWebsite({ url: ctx.input.url });

    return {
      output: { screenshotData: result },
      message: `Captured screenshot of **${ctx.input.url}**.`
    };
  })
  .build();

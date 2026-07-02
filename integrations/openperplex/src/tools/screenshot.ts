import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let screenshot = SlateTool.create(spec, {
  name: 'Website Screenshot',
  key: 'website_screenshot',
  description: `Capture a live screenshot of any web page by providing its URL.
Useful for visual verification, archiving web pages, generating thumbnails, or previewing website content.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('The URL of the web page to capture')
    })
  )
  .output(
    z.object({
      websiteUrl: z.string().describe('The URL that was captured'),
      screenshotUrl: z.string().describe('URL of the captured screenshot image')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getWebsiteScreenshot(ctx.input.url);

    return {
      output: result,
      message: `Captured screenshot of ${ctx.input.url}.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPageContent = SlateTool.create(spec, {
  name: 'Get Page Content',
  key: 'get_page_content',
  description: `Download the full rendered HTML content of a web page. Uses headless browsers with proxy rotation and captcha bypass to retrieve the complete page source, including JavaScript-rendered content.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('URL of the web page to fetch.'),
      timeout: z
        .number()
        .optional()
        .describe('Navigation timeout in milliseconds. Defaults to 30000.'),
      waitUntil: z
        .string()
        .optional()
        .describe(
          'When to consider navigation complete: "load", "domcontentloaded", "networkidle0", or "networkidle2".'
        )
    })
  )
  .output(
    z.object({
      htmlContent: z.any().describe('Full HTML source of the rendered page.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getContent({
      url: ctx.input.url,
      gotoOptions: {
        timeout: ctx.input.timeout,
        waitUntil: ctx.input.waitUntil
      }
    });

    return {
      output: {
        htmlContent: result
      },
      message: `Retrieved rendered HTML content from **${ctx.input.url}**.`
    };
  })
  .build();

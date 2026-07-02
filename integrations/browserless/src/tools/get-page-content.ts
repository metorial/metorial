import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrowserlessClient } from '../lib/client';
import { spec } from '../spec';

export let getPageContent = SlateTool.create(spec, {
  name: 'Get Page Content',
  key: 'get_page_content',
  description: `Retrieve the fully rendered HTML of a web page after JavaScript execution. Provide a URL to navigate to, or supply raw HTML to render in the browser. Returns the complete DOM including dynamically generated content from single-page applications.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().optional().describe('URL of the page to retrieve content from'),
      html: z
        .string()
        .optional()
        .describe('Raw HTML to render in the browser instead of navigating to a URL'),
      gotoOptions: z
        .object({
          waitUntil: z
            .enum(['load', 'domcontentloaded', 'networkidle0', 'networkidle2'])
            .optional(),
          timeout: z.number().optional()
        })
        .optional()
        .describe('Navigation options'),
      waitForSelector: z
        .object({
          selector: z.string(),
          timeout: z.number().optional(),
          visible: z.boolean().optional()
        })
        .optional()
        .describe('Wait for a CSS selector before capturing content'),
      waitForTimeout: z.number().optional().describe('Wait a fixed number of milliseconds'),
      bestAttempt: z
        .boolean()
        .optional()
        .describe('Proceed even when async events fail or timeout'),
      rejectResourceTypes: z.array(z.string()).optional().describe('Resource types to block'),
      userAgent: z.string().optional().describe('Custom User-Agent string')
    })
  )
  .output(
    z.object({
      htmlContent: z.string().describe('Fully rendered HTML content of the page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BrowserlessClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let htmlContent = await client.getContent({
      url: ctx.input.url,
      html: ctx.input.html,
      gotoOptions: ctx.input.gotoOptions,
      waitForSelector: ctx.input.waitForSelector,
      waitForTimeout: ctx.input.waitForTimeout,
      bestAttempt: ctx.input.bestAttempt,
      rejectResourceTypes: ctx.input.rejectResourceTypes,
      userAgent: ctx.input.userAgent
    });

    let source = ctx.input.url ?? 'provided HTML';
    let length = typeof htmlContent === 'string' ? htmlContent.length : 0;

    return {
      output: {
        htmlContent: typeof htmlContent === 'string' ? htmlContent : String(htmlContent)
      },
      message: `Retrieved **${length}** characters of rendered HTML from ${source}.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { ExecutionClient } from '../lib/client';
import { spec } from '../spec';

export let scrapeWebsite = SlateTool.create(spec, {
  name: 'Scrape Website',
  key: 'scrape_website',
  description: `Crawls a website and extracts its HTML content. Supports browser automation commands to interact with the page before extraction — click buttons, type into inputs, scroll, wait for elements, and more. Returns the raw HTML of the page after all commands have been executed.`,
  instructions: [
    'Provide the URL of the page to scrape.',
    'Optionally add automation commands to interact with dynamic content (e.g., click "Load More", wait for content to appear).'
  ],
  constraints: ['Maximum execution time is 60 seconds.', 'Only public URLs are accessible.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('URL of the website to scrape.'),
      commands: z
        .array(
          z.object({
            action: z
              .enum(['click', 'type', 'scroll', 'wait', 'waitForSelector', 'hover'])
              .describe('Browser action to perform.'),
            selector: z.string().optional().describe('CSS selector for the target element.'),
            value: z
              .union([z.string(), z.number()])
              .optional()
              .describe('Value: text for type, milliseconds for wait, pixels for scroll.')
          })
        )
        .optional()
        .describe('Browser automation commands to run before extracting content.')
    })
  )
  .output(
    z.object({
      htmlContent: z.string().describe('Raw HTML content of the scraped page.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ExecutionClient({ token: ctx.auth.token });

    let htmlContent = await client.scrape({
      url: ctx.input.url,
      commands: ctx.input.commands
    });

    return {
      output: { htmlContent },
      message: `Successfully scraped content from ${ctx.input.url}.`
    };
  })
  .build();

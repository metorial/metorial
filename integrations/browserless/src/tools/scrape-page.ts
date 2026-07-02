import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrowserlessClient } from '../lib/client';
import { spec } from '../spec';

let gotoOptionsSchema = z
  .object({
    waitUntil: z
      .enum(['load', 'domcontentloaded', 'networkidle0', 'networkidle2'])
      .optional()
      .describe('When to consider navigation complete'),
    timeout: z.number().optional().describe('Navigation timeout in milliseconds')
  })
  .optional()
  .describe('Navigation options');

let waitForSelectorSchema = z
  .object({
    selector: z.string().describe('CSS selector to wait for'),
    timeout: z.number().optional().describe('Timeout in milliseconds'),
    visible: z.boolean().optional().describe('Wait for element to be visible'),
    hidden: z.boolean().optional().describe('Wait for element to be hidden')
  })
  .optional()
  .describe('Wait for a CSS selector to appear on the page');

export let scrapePage = SlateTool.create(spec, {
  name: 'Scrape Page',
  key: 'scrape_page',
  description: `Extract structured data from a fully rendered web page using CSS selectors. The page is loaded in a real browser with JavaScript execution, then elements matching your selectors are extracted with their text content, inner HTML, attributes, and bounding box positions.`,
  instructions: [
    'Provide one or more CSS selectors in the elements array to target specific content on the page.',
    'The page will be fully rendered including JavaScript before scraping occurs.'
  ],
  constraints: [
    'Selectors must be valid CSS selectors compatible with document.querySelectorAll.',
    'Default wait timeout for selectors is 30 seconds.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('URL of the page to scrape'),
      elements: z
        .array(
          z.object({
            selector: z.string().describe('CSS selector to match elements')
          })
        )
        .min(1)
        .describe('CSS selectors to extract data from'),
      gotoOptions: gotoOptionsSchema,
      waitForSelector: waitForSelectorSchema,
      waitForTimeout: z
        .number()
        .optional()
        .describe('Wait a fixed number of milliseconds before scraping'),
      bestAttempt: z
        .boolean()
        .optional()
        .describe('Attempt to proceed even when async events fail or timeout'),
      rejectResourceTypes: z
        .array(z.string())
        .optional()
        .describe('Resource types to block (e.g., "image", "stylesheet")'),
      userAgent: z.string().optional().describe('Custom User-Agent string')
    })
  )
  .output(
    z.object({
      scrapedElements: z
        .array(
          z.object({
            results: z
              .array(
                z.object({
                  text: z.string().optional().describe('Text content of the element'),
                  html: z.string().optional().describe('Inner HTML of the element'),
                  attributes: z
                    .array(
                      z.object({
                        name: z.string(),
                        value: z.string()
                      })
                    )
                    .optional()
                    .describe('Element attributes'),
                  top: z.number().optional().describe('Top position in pixels'),
                  left: z.number().optional().describe('Left position in pixels'),
                  width: z.number().optional().describe('Width in pixels'),
                  height: z.number().optional().describe('Height in pixels')
                })
              )
              .describe('Matched elements for this selector')
          })
        )
        .describe('Results grouped by each selector')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BrowserlessClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.scrape({
      url: ctx.input.url,
      elements: ctx.input.elements,
      gotoOptions: ctx.input.gotoOptions,
      waitForSelector: ctx.input.waitForSelector,
      waitForTimeout: ctx.input.waitForTimeout,
      bestAttempt: ctx.input.bestAttempt,
      rejectResourceTypes: ctx.input.rejectResourceTypes,
      userAgent: ctx.input.userAgent
    });

    let totalElements = 0;
    let scrapedElements = (result?.data ?? []).map((group: any) => {
      let results = (group?.results ?? []).map((r: any) => {
        totalElements++;
        return {
          text: r.text,
          html: r.html,
          attributes: r.attributes,
          top: r.top,
          left: r.left,
          width: r.width,
          height: r.height
        };
      });
      return { results };
    });

    return {
      output: { scrapedElements },
      message: `Scraped **${totalElements}** element(s) from ${ctx.input.url} across ${ctx.input.elements.length} selector(s).`
    };
  })
  .build();

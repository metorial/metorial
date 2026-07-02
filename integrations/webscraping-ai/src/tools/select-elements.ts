import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { scrapingOptionsSchema } from '../lib/schemas';
import { spec } from '../spec';

export let selectElements = SlateTool.create(spec, {
  name: 'Select Page Elements',
  key: 'select_elements',
  description: `Extract HTML from specific page elements using CSS selectors. Supports single or multiple selectors to retrieve targeted portions of a webpage.
Useful when you only need specific parts of a page like headings, prices, navigation, article content, or any element identifiable by CSS selector.`,
  instructions: [
    'Provide one selector for a single element, or multiple selectors to extract several elements at once.',
    'Standard CSS selectors are supported: tag names (h1), classes (.price), IDs (#main), attributes ([data-id]), and combinations.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('The full URL of the webpage to extract elements from.'),
      selectors: z
        .array(z.string())
        .min(1)
        .describe(
          'One or more CSS selectors to extract. Examples: ["h1", ".price", "#main-content"]'
        ),
      ...scrapingOptionsSchema
    })
  )
  .output(
    z.object({
      elements: z
        .array(
          z.object({
            selector: z.string().describe('The CSS selector used to extract this element.'),
            html: z.string().describe('The extracted HTML for this selector.')
          })
        )
        .describe('The extracted HTML for each selector.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let commonOptions = {
      url: ctx.input.url,
      js: ctx.input.js,
      jsTimeout: ctx.input.jsTimeout,
      timeout: ctx.input.timeout,
      waitFor: ctx.input.waitFor,
      proxy: ctx.input.proxy,
      country: ctx.input.country,
      device: ctx.input.device,
      headers: ctx.input.headers,
      jsScript: ctx.input.jsScript,
      customProxy: ctx.input.customProxy,
      errorOn404: ctx.input.errorOn404,
      errorOnRedirect: ctx.input.errorOnRedirect
    };

    let elements: Array<{ selector: string; html: string }>;

    if (ctx.input.selectors.length === 1) {
      let selector = ctx.input.selectors[0]!;
      let html = await client.getSelected({
        ...commonOptions,
        selector
      });
      elements = [{ selector, html }];
    } else {
      let results = await client.getSelectedMultiple({
        ...commonOptions,
        selectors: ctx.input.selectors
      });

      elements = ctx.input.selectors.map((selector, i) => ({
        selector,
        html: Array.isArray(results) ? results[i] || '' : String(results)
      }));
    }

    return {
      output: { elements },
      message: `Successfully extracted ${elements.length} element(s) from **${ctx.input.url}** using selectors: ${ctx.input.selectors.join(', ')}.`
    };
  })
  .build();

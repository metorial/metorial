import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let runJsScenario = SlateTool.create(spec, {
  name: 'Run JavaScript Scenario',
  key: 'run_js_scenario',
  description: `Execute a sequence of JavaScript actions on a web page before scraping. Click buttons, scroll, wait for elements, fill forms, or run custom JavaScript code. Useful for interacting with dynamic pages that require user interaction before data is available.`,
  instructions: [
    'Each instruction is an object with an action type and parameters.',
    'Supported actions: click (CSS selector), scroll_x/scroll_y (pixels), wait (ms), wait_for (CSS selector), evaluate (JS code), fill (selector + value).',
    'Example: `[{ "click": "#load-more" }, { "wait": 2000 }, { "evaluate": "document.title" }]`.',
    'JavaScript rendering is automatically enabled when using scenarios.',
    'Set strict to true to abort if any instruction fails.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('The full URL of the web page to interact with'),
      instructions: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of action objects to execute sequentially on the page'),
      strict: z
        .boolean()
        .optional()
        .describe('Abort scenario execution if any instruction fails'),
      premiumProxy: z
        .boolean()
        .optional()
        .describe('Use premium proxies for difficult-to-scrape websites'),
      countryCode: z
        .string()
        .optional()
        .describe('Two-letter country code for geo-targeted proxy'),
      device: z.enum(['desktop', 'mobile']).optional().describe('Device type to emulate'),
      wait: z
        .number()
        .optional()
        .describe('Additional time in milliseconds to wait after all instructions complete'),
      waitFor: z
        .string()
        .optional()
        .describe('CSS selector to wait for after all instructions complete')
    })
  )
  .output(
    z.object({
      content: z.string().describe('The page content after executing the JavaScript scenario')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.runJsScenario({
      url: ctx.input.url,
      jsScenario: {
        instructions: ctx.input.instructions,
        strict: ctx.input.strict
      },
      premiumProxy: ctx.input.premiumProxy,
      countryCode: ctx.input.countryCode,
      device: ctx.input.device,
      wait: ctx.input.wait,
      waitFor: ctx.input.waitFor
    });

    let contentStr = typeof result === 'string' ? result : JSON.stringify(result);

    return {
      output: {
        content: contentStr
      },
      message: `Executed ${ctx.input.instructions.length} instruction(s) on **${ctx.input.url}** and retrieved ${contentStr.length} characters of content.`
    };
  });

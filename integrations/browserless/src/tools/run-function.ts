import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrowserlessClient } from '../lib/client';
import { spec } from '../spec';

export let runFunction = SlateTool.create(spec, {
  name: 'Run Browser Function',
  key: 'run_function',
  description: `Execute custom JavaScript/Puppeteer code in a headless browser context. Browserless sets up a browser and page, then runs your code with access to the Puppeteer \`page\` object. Use this for multi-step browser interactions like navigating, filling forms, clicking buttons, and extracting data within a single request.`,
  instructions: [
    'Your code receives a `page` object (Puppeteer Page) as a parameter.',
    'Return data from your function to receive it in the response.',
    'Use the context parameter to pass dynamic data into your function.'
  ],
  constraints: [
    'Code runs in a sandboxed environment. Each request launches a new browser session.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      code: z
        .string()
        .describe(
          'JavaScript code to execute. Receives `page` (Puppeteer Page) and optional `context` as parameters.'
        ),
      context: z
        .record(z.string(), z.any())
        .optional()
        .describe('Key-value context data passed to your function')
    })
  )
  .output(
    z.object({
      result: z.any().describe('Return value from the executed function')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BrowserlessClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.runFunction({
      code: ctx.input.code,
      context: ctx.input.context
    });

    return {
      output: { result },
      message: `Browser function executed successfully.`
    };
  })
  .build();

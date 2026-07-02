import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let selectorSchema = z.object({
  type: z.enum(['css', 'xpath']).describe('Selector type'),
  value: z.string().describe('Selector query string'),
  state: z
    .enum(['attached', 'visible', 'hidden'])
    .optional()
    .describe('Element state to wait for')
});

let actionSchema = z.object({
  action: z
    .enum([
      'click',
      'type',
      'scroll',
      'scrollBottom',
      'waitForSelector',
      'waitForTimeout',
      'waitForRequest',
      'waitForResponse',
      'evaluate',
      'select',
      'setInputFiles'
    ])
    .describe('Action type to perform'),
  selector: selectorSchema.optional().describe('Element selector'),
  text: z.string().optional().describe('Text to type'),
  timeout: z.number().optional().describe('Timeout in milliseconds'),
  source: z.string().optional().describe('JavaScript code (for "evaluate" action)'),
  onError: z.enum(['return', 'ignore']).optional().describe('Error handling strategy')
});

export let takeScreenshot = SlateTool.create(spec, {
  name: 'Take Screenshot',
  key: 'take_screenshot',
  description: `Capture a screenshot of any web page rendered in a headless browser. Returns a base64-encoded PNG image. Supports full-page screenshots, browser actions before capture (e.g. scrolling, clicking, waiting), and device emulation.`,
  instructions: [
    'The screenshot is returned as a base64-encoded PNG string.',
    'Use actions to interact with the page before taking the screenshot (e.g. close popups, scroll to content).'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      url: z.string().describe('URL of the page to screenshot'),
      fullPage: z
        .boolean()
        .optional()
        .describe('Capture the full page instead of just the viewport'),
      actions: z
        .array(actionSchema)
        .optional()
        .describe('Browser actions to perform before taking the screenshot'),
      device: z.enum(['desktop', 'mobile']).optional().describe('Device type for emulation'),
      geolocation: z.string().optional().describe('Country code for request origin'),
      ipType: z
        .enum(['datacenter', 'residential'])
        .optional()
        .describe('IP address type to use')
    })
  )
  .output(
    z.object({
      url: z.string().describe('Final URL after any redirects'),
      statusCode: z.number().optional().describe('HTTP status code'),
      screenshot: z.string().describe('Base64-encoded PNG screenshot image')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.progress('Capturing screenshot...');

    let response = await client.extract({
      url: ctx.input.url,
      screenshot: true,
      screenshotOptions: ctx.input.fullPage ? { fullPage: true } : undefined,
      actions: ctx.input.actions,
      device: ctx.input.device,
      geolocation: ctx.input.geolocation,
      ipType: ctx.input.ipType
    });

    return {
      output: {
        url: response.url,
        statusCode: response.statusCode,
        screenshot: response.screenshot ?? ''
      },
      message: `Screenshot captured for **${response.url}**${ctx.input.fullPage ? ' (full page)' : ''}`
    };
  })
  .build();

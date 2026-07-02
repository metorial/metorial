import { SlateTool } from 'slates';
import { z } from 'zod';
import { ExecutionClient } from '../lib/client';
import { spec } from '../spec';

export let generateImage = SlateTool.create(spec, {
  name: 'Generate Image',
  key: 'generate_image',
  description: `Generates PNG images from HTML content or captures high-resolution screenshots of websites. Use **html_to_png** to convert styled HTML into images (useful for charts, infographics, OG images). Use **screenshot** to capture a snapshot of any public URL with optional browser automation commands and cropping.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      mode: z
        .enum(['html_to_png', 'screenshot'])
        .describe('Whether to convert HTML to PNG or capture a website screenshot.'),
      html: z
        .string()
        .optional()
        .describe('HTML content to convert to PNG. Required for html_to_png mode.'),
      url: z
        .string()
        .optional()
        .describe('URL of the website to capture. Required for screenshot mode.'),
      commands: z
        .array(
          z.object({
            action: z
              .enum(['click', 'type', 'scroll', 'wait', 'waitForSelector', 'hover'])
              .describe('Browser action to perform.'),
            selector: z
              .string()
              .optional()
              .describe(
                'CSS selector for the target element. Required for click, type, waitForSelector, hover.'
              ),
            value: z
              .union([z.string(), z.number()])
              .optional()
              .describe(
                'Value for the action: text for type, milliseconds for wait, pixels for scroll.'
              )
          })
        )
        .optional()
        .describe(
          'Browser automation commands to run before taking the screenshot. Only for screenshot mode.'
        ),
      cropBox: z
        .object({
          x: z.number().describe('X coordinate of the crop area.'),
          y: z.number().describe('Y coordinate of the crop area.'),
          width: z.number().describe('Width of the crop area in pixels.'),
          height: z.number().describe('Height of the crop area in pixels.')
        })
        .optional()
        .describe('Bounding box to crop the screenshot. Only for screenshot mode.')
    })
  )
  .output(
    z.object({
      imageBase64: z.string().describe('Base64-encoded PNG image.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ExecutionClient({ token: ctx.auth.token });

    if (ctx.input.mode === 'html_to_png') {
      if (!ctx.input.html) throw new Error('html is required for html_to_png mode.');
      let imageBase64 = await client.htmlToPng({ html: ctx.input.html });
      return {
        output: { imageBase64 },
        message: `PNG image generated from HTML content.`
      };
    } else {
      if (!ctx.input.url) throw new Error('url is required for screenshot mode.');
      let imageBase64 = await client.screenshot({
        url: ctx.input.url,
        commands: ctx.input.commands,
        box: ctx.input.cropBox
      });
      return {
        output: { imageBase64 },
        message: `Screenshot captured of ${ctx.input.url}.`
      };
    }
  })
  .build();

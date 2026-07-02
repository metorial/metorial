import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateImage = SlateTool.create(spec, {
  name: 'Generate Image',
  key: 'generate_image',
  description: `Generate an image from a design template with optional element customizations. Provide a template ID and override specific elements such as text content, colors, or image sources to produce a customized PNG image. Returns the generated image URL along with dimensions and credit usage.`,
  constraints: ['Each image generation consumes 1 account credit.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('The ID of the design template to use for generation'),
      elements: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Key-value pairs to override template element properties (e.g., text content, colors, image sources)'
        )
    })
  )
  .output(
    z.object({
      imageUrl: z.string().describe('URL of the generated image'),
      width: z.number().optional().describe('Width of the generated image in pixels'),
      height: z.number().optional().describe('Height of the generated image in pixels'),
      format: z.string().optional().describe('Image format (e.g., png)'),
      previousCredits: z.number().optional().describe('Credit balance before generation'),
      creditsUsed: z.number().optional().describe('Number of credits consumed'),
      remainingCredits: z.number().optional().describe('Credit balance after generation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.generateImage(ctx.input.templateId, ctx.input.elements);

    return {
      output: {
        imageUrl: result.imageURL,
        width: result.details?.dimensions?.width,
        height: result.details?.dimensions?.height,
        format: result.details?.format,
        previousCredits: result.usage?.previousCredits,
        creditsUsed: result.usage?.creditsUsed,
        remainingCredits: result.usage?.remainingCredits
      },
      message: `Image generated successfully. [View image](${result.imageURL}). Credits remaining: **${result.usage?.remainingCredits ?? 'unknown'}**.`
    };
  })
  .build();

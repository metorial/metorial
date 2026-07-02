import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateImage = SlateTool.create(spec, {
  name: 'Generate Image',
  key: 'generate_image',
  description: `Generate images from text prompts using AI. Provide a descriptive prompt and receive up to 4 generated images.

Adjust the guidance scale to control how closely the output matches the prompt — lower values produce more creative results, higher values adhere more strictly to the prompt.`,
  constraints: [
    'Prompt must be 3–1024 characters.',
    'Can generate 1–4 images per request.',
    'Guidance scale range: 1–50 (default: 5).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      prompt: z
        .string()
        .min(3)
        .max(1024)
        .describe('Text prompt describing the image to generate'),
      numberOfImages: z
        .number()
        .min(1)
        .max(4)
        .optional()
        .describe('Number of images to generate (1–4, default: 4)'),
      guidanceScale: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .describe('Prompt adherence strength (1–50, default: 5)'),
      outputDestination: z
        .string()
        .optional()
        .describe(
          'Storage URI for output (e.g. "storage://bucket/path/"). Omit for temporary URLs.'
        )
    })
  )
  .output(
    z.object({
      prompt: z.string().optional().describe('The prompt used for generation'),
      images: z
        .array(
          z.object({
            format: z.string().optional().describe('Image format'),
            width: z.number().optional().describe('Image width in pixels'),
            height: z.number().optional().describe('Image height in pixels'),
            temporaryUrl: z
              .string()
              .optional()
              .describe('Temporary public URL (24h lifespan)'),
            storageUri: z
              .string()
              .optional()
              .describe('Storage URI if output destination was specified')
          })
        )
        .describe('Generated images')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let options: Record<string, unknown> = {};
    if (ctx.input.numberOfImages !== undefined)
      options.number_of_images = ctx.input.numberOfImages;
    if (ctx.input.guidanceScale !== undefined)
      options.guidance_scale = ctx.input.guidanceScale;

    ctx.info('Generating image from prompt');
    let result = await client.generateImage({
      input: ctx.input.prompt,
      options: Object.keys(options).length > 0 ? (options as any) : undefined,
      output: ctx.input.outputDestination
    });

    let data = result.data;
    let outputs = Array.isArray(data.output) ? data.output : [data.output];

    let images = outputs.map((img: any) => ({
      format: img.format,
      width: img.width,
      height: img.height,
      temporaryUrl: img.tmp_url,
      storageUri: img.claid_storage_uri
    }));

    return {
      output: {
        prompt: data.input?.text,
        images
      },
      message: `Generated **${images.length}** image(s) from prompt. ${images[0]?.temporaryUrl ? `[View first result](${images[0].temporaryUrl})` : ''}`
    };
  })
  .build();

import { createBase64Attachment, SlateTool } from '@slates/provider';
import { z } from 'zod';
import { openAIServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let usesGptImageModelOrOptions = (params: { model?: string; quality?: string }) =>
  params.model?.startsWith('gpt-image-') ||
  ['low', 'medium', 'high', 'auto'].includes(params.quality ?? '');

export let generateImage = SlateTool.create(spec, {
  name: 'Generate Image',
  key: 'generate_image',
  description: `Generate images from text prompts using OpenAI's image generation models (e.g. DALL·E 3, gpt-image-1). Returns generated image content as Slate attachments when the API returns base64 data. Supports configurable size, quality, and style.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      prompt: z.string().describe('Text description of the image to generate'),
      model: z
        .string()
        .optional()
        .describe(
          'Model to use (e.g. "dall-e-3", "gpt-image-1"). Defaults to the latest available model.'
        ),
      n: z.number().min(1).max(10).optional().describe('Number of images to generate (1-10)'),
      quality: z
        .enum(['standard', 'hd', 'low', 'medium', 'high', 'auto'])
        .optional()
        .describe('Quality of the generated image'),
      size: z
        .enum(['256x256', '512x512', '1024x1024', '1792x1024', '1024x1792'])
        .optional()
        .describe('Size of the generated image'),
      style: z
        .enum(['vivid', 'natural'])
        .optional()
        .describe('Style of the generated image (DALL·E 3 only)'),
      outputFormat: z
        .enum(['url', 'b64_json'])
        .optional()
        .describe(
          'Legacy DALL-E response transport. Use "b64_json" for attachment output. GPT image models always return base64 image data and do not support "url".'
        ),
      user: z.string().optional().describe('Unique identifier for the end-user')
    })
  )
  .output(
    z.object({
      images: z
        .array(
          z.object({
            url: z.string().optional().describe('Temporary URL of the generated image'),
            attachmentIndex: z
              .number()
              .optional()
              .describe('Index of the generated image attachment, when returned'),
            mimeType: z.string().optional().describe('MIME type of the generated attachment'),
            revisedPrompt: z
              .string()
              .optional()
              .describe('Revised prompt used for generation (DALL·E 3)')
          })
        )
        .describe('Generated images'),
      createdAt: z.number().describe('Unix timestamp when images were created'),
      attachmentCount: z.number().describe('Number of generated image attachments returned')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.outputFormat === 'url' && usesGptImageModelOrOptions(ctx.input)) {
      throw openAIServiceError(
        'outputFormat "url" is only supported for DALL-E image models. GPT image models always return base64 image data as attachments.'
      );
    }

    let client = createClient(ctx);

    let result = await client.createImage({
      prompt: ctx.input.prompt,
      model: ctx.input.model,
      n: ctx.input.n,
      quality: ctx.input.quality,
      size: ctx.input.size,
      style: ctx.input.style,
      responseFormat: ctx.input.outputFormat,
      user: ctx.input.user
    });

    let attachments: ReturnType<typeof createBase64Attachment>[] = [];

    let images = (result.data ?? []).map((img: any) => {
      let attachmentIndex: number | undefined;
      if (typeof img.b64_json === 'string') {
        attachmentIndex = attachments.length;
        attachments.push(createBase64Attachment(img.b64_json, 'image/png'));
      }
      return {
        url: img.url,
        attachmentIndex,
        mimeType: attachmentIndex === undefined ? undefined : 'image/png',
        revisedPrompt: img.revised_prompt
      };
    });

    return {
      output: {
        images,
        createdAt: result.created,
        attachmentCount: attachments.length
      },
      attachments,
      message: `Generated **${images.length}** image(s) from prompt.`
    };
  })
  .build();

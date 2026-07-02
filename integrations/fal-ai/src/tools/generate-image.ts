import { SlateTool } from 'slates';
import { z } from 'zod';
import { FalClient } from '../lib/client';
import { spec } from '../spec';

let loraSchema = z.object({
  path: z.string().describe('URL or path to the LoRA weights'),
  scale: z.number().optional().describe('Scale factor for the LoRA adapter, typically 0.0-1.0')
});

export let generateImage = SlateTool.create(spec, {
  name: 'Generate Image',
  key: 'generate_image',
  description: `Generate images from text prompts or transform existing images using Fal.ai models such as FLUX, Stable Diffusion, Ideogram, Recraft, and more.
Supports text-to-image and image-to-image generation with configurable parameters like image size, guidance scale, LoRA adapters, and safety settings.
Runs synchronously and returns generated image URLs.`,
  instructions: [
    'Use the modelId parameter to select the model endpoint, e.g. "fal-ai/flux/schnell" or "fal-ai/flux/dev".',
    'For image-to-image, provide an imageUrl in the input.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      modelId: z
        .string()
        .describe(
          'Model endpoint ID, e.g. "fal-ai/flux/schnell", "fal-ai/flux/dev", "fal-ai/stable-diffusion-v35-large"'
        ),
      prompt: z.string().describe('Text prompt describing the desired image'),
      negativePrompt: z
        .string()
        .optional()
        .describe('Text describing what to avoid in the generated image'),
      imageUrl: z
        .string()
        .optional()
        .describe('Input image URL for image-to-image generation'),
      imageSize: z
        .union([
          z.enum([
            'square_hd',
            'square',
            'portrait_4_3',
            'portrait_16_9',
            'landscape_4_3',
            'landscape_16_9'
          ]),
          z.object({
            width: z.number().describe('Image width in pixels'),
            height: z.number().describe('Image height in pixels')
          })
        ])
        .optional()
        .describe('Output image size as a preset or custom dimensions'),
      numInferenceSteps: z
        .number()
        .optional()
        .describe('Number of inference steps (higher = more detail, slower)'),
      guidanceScale: z
        .number()
        .optional()
        .describe('Guidance scale for prompt adherence, typically 1.0-20.0'),
      seed: z.number().optional().describe('Random seed for reproducible generation'),
      numImages: z.number().optional().describe('Number of images to generate, defaults to 1'),
      enableSafetyChecker: z
        .boolean()
        .optional()
        .describe('Whether to enable the safety content checker'),
      loras: z
        .array(loraSchema)
        .optional()
        .describe('LoRA adapters to apply for customized styles'),
      strength: z
        .number()
        .optional()
        .describe('Strength for image-to-image transformation, 0.0-1.0')
    })
  )
  .output(
    z.object({
      images: z
        .array(
          z.object({
            url: z.string().describe('URL of the generated image on fal CDN'),
            contentType: z.string().optional().describe('MIME type of the generated image'),
            width: z.number().optional().describe('Width of the generated image in pixels'),
            height: z.number().optional().describe('Height of the generated image in pixels')
          })
        )
        .describe('Array of generated images'),
      seed: z.number().optional().describe('Seed used for generation'),
      timings: z
        .record(z.string(), z.any())
        .optional()
        .describe('Timing information for the generation process'),
      hasNsfwConcepts: z
        .array(z.boolean())
        .optional()
        .describe('NSFW detection results per image')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FalClient(ctx.auth.token);

    let input: Record<string, any> = {
      prompt: ctx.input.prompt
    };

    if (ctx.input.negativePrompt) input.negative_prompt = ctx.input.negativePrompt;
    if (ctx.input.imageUrl) input.image_url = ctx.input.imageUrl;
    if (ctx.input.imageSize) input.image_size = ctx.input.imageSize;
    if (ctx.input.numInferenceSteps) input.num_inference_steps = ctx.input.numInferenceSteps;
    if (ctx.input.guidanceScale !== undefined) input.guidance_scale = ctx.input.guidanceScale;
    if (ctx.input.seed !== undefined) input.seed = ctx.input.seed;
    if (ctx.input.numImages) input.num_images = ctx.input.numImages;
    if (ctx.input.enableSafetyChecker !== undefined)
      input.enable_safety_checker = ctx.input.enableSafetyChecker;
    if (ctx.input.strength !== undefined) input.strength = ctx.input.strength;
    if (ctx.input.loras) {
      input.loras = ctx.input.loras.map(l => ({
        path: l.path,
        scale: l.scale
      }));
    }

    ctx.progress('Generating image...');
    let result = await client.runModel(ctx.input.modelId, input);

    let images = (result.images || []).map((img: any) => ({
      url: img.url,
      contentType: img.content_type,
      width: img.width,
      height: img.height
    }));

    return {
      output: {
        images,
        seed: result.seed,
        timings: result.timings,
        hasNsfwConcepts: result.has_nsfw_concepts
      },
      message: `Generated ${images.length} image(s) using **${ctx.input.modelId}**.${images.map((img: any) => `\n- ${img.url}`).join('')}`
    };
  })
  .build();

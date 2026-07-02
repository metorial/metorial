import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let placementSchema = z
  .object({
    type: z
      .enum(['absolute', 'original', 'padding'])
      .optional()
      .describe(
        'Placement type: "absolute" for manual control, "original" to keep input position, "padding" for uniform spacing'
      ),
    scale: z
      .number()
      .min(0.01)
      .max(1)
      .optional()
      .describe('Object scale relative to scene (0.01–1.0)'),
    positionX: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe('Horizontal position (0–1, left to right)'),
    positionY: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe('Vertical position (0–1, top to bottom)'),
    rotationDegree: z
      .number()
      .min(0)
      .max(360)
      .optional()
      .describe('Rotation in degrees (0–360)')
  })
  .optional()
  .describe('Object placement configuration');

let promptSceneSchema = z
  .object({
    prompt: z
      .string()
      .optional()
      .describe('Text prompt describing the background scene. Omit to use Autoprompt AI.'),
    negativePrompt: z
      .string()
      .optional()
      .describe('Elements to exclude from the generated background'),
    preference: z
      .enum(['fast', 'optimal', 'best'])
      .optional()
      .describe('Quality preset balancing speed vs. quality'),
    steps: z
      .number()
      .min(1)
      .max(49)
      .optional()
      .describe('Inference steps (1–49) for quality control')
  })
  .optional()
  .describe('Prompt-based scene generation');

let templateSceneSchema = z
  .object({
    templateUrl: z.string().describe('URL of the reference background template image'),
    templateMode: z
      .enum(['transform', 'adjust', 'lock'])
      .optional()
      .describe('How to apply the template'),
    view: z.enum(['top', 'front']).optional().describe('Camera perspective'),
    prompt: z
      .string()
      .optional()
      .describe('Additional prompt to customize the templated scene')
  })
  .optional()
  .describe('Template-based scene generation');

let effectSceneSchema = z
  .object({
    effect: z.enum(['shadows']).optional().describe('Background effect type'),
    color: z.string().optional().describe('Background color (hex) or "transparent"'),
    view: z.enum(['top', 'front', 'auto']).optional().describe('Camera perspective'),
    model: z.enum(['v1', 'v2-beta', 'v2']).optional().describe('AI model version'),
    aspectRatio: z
      .string()
      .optional()
      .describe('Output aspect ratio (e.g. "1:1", "4:3", "16:9")')
  })
  .optional()
  .describe('Effect-based background');

export let generateBackground = SlateTool.create(spec, {
  name: 'Generate Background',
  key: 'generate_background',
  description: `Generate AI backgrounds for product images. Supports three modes:

- **Prompt-based**: Describe the desired background with text. Use Autoprompt AI by omitting the prompt.
- **Template-based**: Use a reference image as a background template.
- **Effect-based**: Apply effects like shadows on a solid color or transparent background.

Provide a product image URL and configure object placement, scene type, and output preferences.`,
  instructions: [
    'Use exactly one scene type: promptScene, templateScene, or effectScene.',
    'For prompt-based scenes, omitting the prompt activates Autoprompt AI.'
  ],
  constraints: ['Can generate 1–4 images per request.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      imageUrl: z.string().describe('Product image URL'),
      placement: placementSchema,
      promptScene: promptSceneSchema,
      templateScene: templateSceneSchema,
      effectScene: effectSceneSchema,
      numberOfImages: z
        .number()
        .min(1)
        .max(4)
        .optional()
        .describe('Number of images to generate (1–4)'),
      outputFormat: z
        .enum(['png', 'jpeg', 'webp', 'avif'])
        .optional()
        .describe('Output format'),
      outputDestination: z.string().optional().describe('Storage URI for output')
    })
  )
  .output(
    z.object({
      inputMetadata: z
        .object({
          format: z.string().optional(),
          width: z.number().optional(),
          height: z.number().optional()
        })
        .optional()
        .describe('Input image metadata'),
      images: z
        .array(
          z.object({
            format: z.string().optional(),
            width: z.number().optional(),
            height: z.number().optional(),
            temporaryUrl: z.string().optional(),
            storageUri: z.string().optional()
          })
        )
        .describe('Generated background images')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let objectConfig: Record<string, unknown> = {
      image_url: ctx.input.imageUrl
    };

    if (ctx.input.placement) {
      let p = ctx.input.placement;
      if (p.type) objectConfig.placement_type = p.type;
      if (p.scale !== undefined) objectConfig.scale = p.scale;
      if (p.rotationDegree !== undefined) objectConfig.rotation_degree = p.rotationDegree;
      if (p.positionX !== undefined || p.positionY !== undefined) {
        objectConfig.position = {
          x: p.positionX ?? 0.5,
          y: p.positionY ?? 0.5
        };
      }
    }

    let scene: Record<string, unknown> = {};

    if (ctx.input.promptScene) {
      let ps = ctx.input.promptScene;
      if (ps.prompt) {
        scene.prompt = ps.prompt;
      } else {
        scene.prompt = { generate: true };
      }
      if (ps.negativePrompt) scene.negative_prompt = ps.negativePrompt;
      if (ps.preference) scene.preference = ps.preference;
      if (ps.steps !== undefined) scene.steps = ps.steps;
    } else if (ctx.input.templateScene) {
      let ts = ctx.input.templateScene;
      scene.template_url = ts.templateUrl;
      if (ts.templateMode) scene.template_mode = ts.templateMode;
      if (ts.view) scene.view = ts.view;
      if (ts.prompt) scene.prompt = ts.prompt;
    } else if (ctx.input.effectScene) {
      let es = ctx.input.effectScene;
      if (es.effect) scene.effect = es.effect;
      if (es.color) scene.color = es.color;
      if (es.view) scene.view = es.view;
      if (es.model) scene.model = es.model;
      if (es.aspectRatio) scene.aspect_ratio = es.aspectRatio;
    }

    let output: Record<string, unknown> = {};
    if (ctx.input.numberOfImages) output.number_of_images = ctx.input.numberOfImages;
    if (ctx.input.outputFormat) output.format = ctx.input.outputFormat;
    if (ctx.input.outputDestination) output.destination = ctx.input.outputDestination;

    ctx.info('Generating AI background');
    let result = await client.createScene({
      object: objectConfig,
      scene,
      output: Object.keys(output).length > 0 ? output : undefined
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
        inputMetadata: data.input
          ? {
              format: data.input.format,
              width: data.input.width,
              height: data.input.height
            }
          : undefined,
        images
      },
      message: `Generated **${images.length}** background image(s). ${images[0]?.temporaryUrl ? `[View first result](${images[0].temporaryUrl})` : ''}`
    };
  })
  .build();

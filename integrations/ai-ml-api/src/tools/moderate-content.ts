import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let moderateContent = SlateTool.create(spec, {
  name: 'Moderate Content',
  key: 'moderate_content',
  description: `Classify text or image content as safe or unsafe using Meta's Llama Guard content moderation models.
Analyzes input for harmful content and returns a safety classification with hazard categories when unsafe.
Supports text, image URLs, and base64-encoded images.`,
  instructions: [
    'For text moderation, provide the text content directly.',
    'For image moderation, provide the image URL in the imageUrl field.',
    'Unsafe content will include a hazard category explaining why it was flagged.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      model: z
        .string()
        .optional()
        .default('Meta-Llama-Guard-3-8B')
        .describe('Moderation model ID. Default: "Meta-Llama-Guard-3-8B"'),
      text: z.string().optional().describe('Text content to moderate'),
      imageUrl: z.string().optional().describe('URL of an image to moderate')
    })
  )
  .output(
    z.object({
      classification: z
        .string()
        .describe('The moderation result text (e.g. "safe" or "unsafe" with category)'),
      isSafe: z.boolean().describe('Whether the content was classified as safe'),
      model: z.string().describe('Model used for moderation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;

    if (ctx.input.imageUrl && ctx.input.text) {
      content = [
        { type: 'text', text: ctx.input.text },
        { type: 'image_url', image_url: { url: ctx.input.imageUrl } }
      ];
    } else if (ctx.input.imageUrl) {
      content = [{ type: 'image_url', image_url: { url: ctx.input.imageUrl } }];
    } else {
      content = ctx.input.text ?? '';
    }

    let result = await client.moderateContent(ctx.input.model, [{ role: 'user', content }]);

    let classification = result.choices[0]?.message?.content ?? '';
    let isSafe = classification.toLowerCase().startsWith('safe');

    return {
      output: {
        classification,
        isSafe,
        model: result.model
      },
      message: `Content classified as **${isSafe ? 'safe ✅' : 'unsafe ⚠️'}** by **${result.model}**.${!isSafe ? ` Details: ${classification}` : ''}`
    };
  })
  .build();

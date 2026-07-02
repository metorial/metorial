import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let analyzeImage = SlateTool.create(spec, {
  name: 'Analyze Image',
  key: 'analyze_image',
  description: `Analyze images using Groq's multimodal vision models. Provide an image (via URL or base64 data) along with a text prompt to get descriptions, answers to questions, or structured analysis of visual content.`,
  instructions: [
    'Provide either an image URL or base64-encoded image data.',
    'Image URL size limit is 20MB. Base64 encoded size limit is 4MB. Max resolution is 33 megapixels.',
    'Up to 5 images can be analyzed per request by passing multiple image entries.'
  ],
  constraints: [
    'Maximum 5 images per request',
    'URL images max 20MB, base64 images max 4MB',
    'Max resolution 33 megapixels per image'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      prompt: z.string().describe('Text prompt or question about the image(s)'),
      images: z
        .array(
          z.object({
            url: z
              .string()
              .describe('Image URL or base64 data URI (e.g., "data:image/jpeg;base64,...")'),
            detail: z.enum(['auto', 'low', 'high']).optional().describe('Image detail level')
          })
        )
        .min(1)
        .max(5)
        .describe('Array of images to analyze'),
      model: z
        .string()
        .default('meta-llama/llama-4-scout-17b-16e-instruct')
        .describe('Vision model to use'),
      systemPrompt: z
        .string()
        .optional()
        .describe('Optional system prompt to guide the analysis'),
      temperature: z.number().min(0).max(2).optional().describe('Sampling temperature'),
      maxCompletionTokens: z.number().optional().describe('Maximum tokens to generate')
    })
  )
  .output(
    z.object({
      completionId: z.string().describe('Unique identifier for this completion'),
      content: z.string().nullable().describe('Generated analysis text'),
      finishReason: z.string().describe('Why generation stopped'),
      promptTokens: z.number().describe('Number of tokens in the prompt'),
      completionTokens: z.number().describe('Number of tokens in the completion'),
      totalTokens: z.number().describe('Total tokens used')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let imageContent = ctx.input.images.map(img => ({
      type: 'image_url' as const,
      image_url: {
        url: img.url,
        detail: img.detail
      }
    }));

    let userContent: Array<{
      type: string;
      text?: string;
      image_url?: { url: string; detail?: string };
    }> = [...imageContent, { type: 'text', text: ctx.input.prompt }];

    let messages: Array<{
      role: 'system' | 'user' | 'assistant' | 'tool';
      content:
        | string
        | Array<{ type: string; text?: string; image_url?: { url: string; detail?: string } }>;
    }> = [];

    if (ctx.input.systemPrompt) {
      messages.push({ role: 'system', content: ctx.input.systemPrompt });
    }

    messages.push({ role: 'user', content: userContent });

    let result = await client.createChatCompletion({
      model: ctx.input.model,
      messages,
      temperature: ctx.input.temperature,
      maxCompletionTokens: ctx.input.maxCompletionTokens
    });

    let choice = result.choices[0];

    return {
      output: {
        completionId: result.id,
        content: choice?.message?.content ?? null,
        finishReason: choice?.finish_reason ?? 'unknown',
        promptTokens: result.usage.prompt_tokens,
        completionTokens: result.usage.completion_tokens,
        totalTokens: result.usage.total_tokens
      },
      message: `Analyzed ${ctx.input.images.length} image(s) using **${ctx.input.model}**. Used ${result.usage.total_tokens} tokens.`
    };
  })
  .build();

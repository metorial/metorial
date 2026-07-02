import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateSocialMediaPost = SlateTool.create(spec, {
  name: 'Generate Social Media Post',
  key: 'generate_social_media_post',
  description: `Generate social media posts for various platforms. Provide context and keywords to create platform-optimized content for Twitter, LinkedIn, Instagram, and more.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      context: z.string().describe('Context or topic for the social media post'),
      keywords: z.array(z.string()).optional().describe('Keywords to include in the post'),
      platform: z
        .enum(['twitter', 'linkedin', 'instagram', 'facebook'])
        .optional()
        .describe('Target social media platform (default: "twitter")'),
      targetAudience: z.string().optional().describe('Target audience for the post'),
      model: z
        .enum(['velox-1', 'alta-1', 'sophos-1', 'chat-sophos-1'])
        .optional()
        .describe('AI model to use'),
      maxTokens: z
        .number()
        .optional()
        .describe('Maximum number of tokens to generate (default: 512)'),
      temperature: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Creativity level from 0 to 1. Default: 0.7'),
      generationCount: z
        .number()
        .min(1)
        .max(10)
        .optional()
        .describe('Number of post variations to generate (default: 1)'),
      sourceLang: z.string().optional().describe('Source language code or "auto"'),
      targetLang: z.string().optional().describe('Target language code for the generated post')
    })
  )
  .output(
    z.object({
      posts: z
        .array(
          z.object({
            text: z.string().describe('Generated social media post content'),
            index: z.number().describe('Index of this generation')
          })
        )
        .describe('Array of generated social media posts'),
      remainingCredits: z.number().describe('Remaining API credits')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.generateSocialMediaPost({
      context: ctx.input.context,
      keywords: ctx.input.keywords,
      platform: ctx.input.platform,
      targetAudience: ctx.input.targetAudience,
      model: ctx.input.model,
      maxTokens: ctx.input.maxTokens,
      temperature: ctx.input.temperature,
      n: ctx.input.generationCount,
      sourceLang: ctx.input.sourceLang,
      targetLang: ctx.input.targetLang
    });

    let outputs = result.data.outputs;

    return {
      output: {
        posts: outputs.map(o => ({ text: o.text, index: o.index })),
        remainingCredits: result.data.remaining_credits
      },
      message: `Generated **${outputs.length}** ${ctx.input.platform || 'twitter'} post(s). Remaining credits: ${result.data.remaining_credits}.`
    };
  })
  .build();

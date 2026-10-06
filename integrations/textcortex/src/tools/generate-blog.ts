import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { generationMetadata, modelInput } from '../lib/schemas';
import { spec } from '../spec';

export let generateBlog = SlateTool.create(spec, {
  name: 'Generate Blog Article',
  key: 'generate_blog',
  description: `Generate blog articles based on a title and optional keywords. Produces long-form blog content suitable for publishing. Supports specifying blog categories and tone via keywords.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      title: z.string().min(1).describe('The blog article title'),
      keywords: z
        .array(z.string())
        .optional()
        .describe('Keywords to incorporate into the article'),
      blogCategories: z
        .array(z.string())
        .optional()
        .describe('Blog categories for content targeting'),
      model: modelInput,
      maxTokens: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Maximum number of tokens to generate (default: 2048)'),
      temperature: z
        .number()
        .min(0)
        .max(2)
        .optional()
        .describe("Creativity level from 0 to 2. Omit to use the model's default"),
      generationCount: z
        .number()
        .int()
        .min(1)
        .max(5)
        .optional()
        .describe('Number of article variations to generate (default: 1)'),
      sourceLang: z.string().optional().describe('Source language code or "auto"'),
      targetLang: z
        .string()
        .optional()
        .describe('Target language code for the generated article')
    })
  )
  .output(
    z.object({
      articles: z
        .array(
          z.object({
            text: z.string().min(1).describe('Generated blog article content'),
            index: z.number().describe('Index of this generation')
          })
        )
        .describe('Array of generated blog articles'),
      ...generationMetadata,
      remainingCredits: z
        .number()
        .optional()
        .describe('Remaining API credits when the balance can be retrieved')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.generateBlog({
      title: ctx.input.title,
      keywords: ctx.input.keywords,
      blogCategories: ctx.input.blogCategories,
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
        articles: outputs.map(o => ({ text: o.text, index: o.index })),
        balanceWarning: result.balanceWarning,
        completionId: result.completionId,
        model: result.model,
        usage: result.usage,
        remainingCredits: result.data.remaining_credits
      },
      message: `Generated **${outputs.length}** blog article(s) for title "${ctx.input.title}". ${result.balanceWarning ?? `Remaining credits: ${result.data.remaining_credits}.`}`
    };
  })
  .build();

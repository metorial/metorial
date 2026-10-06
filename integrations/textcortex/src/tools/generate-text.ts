import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { generationMetadata, modelInput } from '../lib/schemas';
import { spec } from '../spec';

export let generateText = SlateTool.create(spec, {
  name: 'Generate Text',
  key: 'generate_text',
  description: `Generate text content from a prompt using TextCortex AI models. Useful for general-purpose text generation, autocomplete, and expanding on ideas. Returns one or more generated text variations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      prompt: z.string().min(1).describe('The text prompt to generate content from'),
      model: modelInput,
      maxTokens: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Maximum number of tokens to generate (default: 512)'),
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
        .max(10)
        .optional()
        .describe('Number of text variations to generate (default: 1)'),
      sourceLang: z
        .string()
        .optional()
        .describe('Source language code (e.g., "en", "de") or "auto" for automatic detection'),
      targetLang: z.string().optional().describe('Target language code for the generated text')
    })
  )
  .output(
    z.object({
      texts: z
        .array(
          z.object({
            text: z.string().min(1).describe('Generated text content'),
            index: z.number().describe('Index of this generation')
          })
        )
        .describe('Array of generated text outputs'),
      ...generationMetadata,
      remainingCredits: z
        .number()
        .optional()
        .describe('Remaining API credits after generation when the balance can be retrieved')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.generateText({
      prompt: ctx.input.prompt,
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
        texts: outputs.map(o => ({ text: o.text, index: o.index })),
        balanceWarning: result.balanceWarning,
        completionId: result.completionId,
        model: result.model,
        usage: result.usage,
        remainingCredits: result.data.remaining_credits
      },
      message: `Generated **${outputs.length}** text variation(s). ${result.balanceWarning ?? `Remaining credits: ${result.data.remaining_credits}.`}`
    };
  })
  .build();

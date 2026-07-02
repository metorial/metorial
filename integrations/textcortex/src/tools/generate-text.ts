import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      prompt: z.string().describe('The text prompt to generate content from'),
      model: z
        .enum(['velox-1', 'alta-1', 'sophos-1', 'chat-sophos-1'])
        .optional()
        .describe(
          'AI model to use. Velox is fastest, Alta is most powerful, Sophos is specialized.'
        ),
      maxTokens: z
        .number()
        .optional()
        .describe('Maximum number of tokens to generate (default: 512)'),
      temperature: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe(
          'Creativity level from 0 (deterministic) to 1 (most creative). Default: 0.7'
        ),
      generationCount: z
        .number()
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
            text: z.string().describe('Generated text content'),
            index: z.number().describe('Index of this generation')
          })
        )
        .describe('Array of generated text outputs'),
      remainingCredits: z.number().describe('Remaining API credits after this request')
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
        remainingCredits: result.data.remaining_credits
      },
      message: `Generated **${outputs.length}** text variation(s). Remaining credits: ${result.data.remaining_credits}.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { generationMetadata, modelInput } from '../lib/schemas';
import { spec } from '../spec';

export let rewriteText = SlateTool.create(spec, {
  name: 'Rewrite Text',
  key: 'rewrite_text',
  description: `Rewrite or paraphrase text without changing its meaning. Supports different rewriting modes such as passive voice, simplification, and more. Useful for improving readability or changing tone.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      text: z.string().min(1).describe('The text to rewrite or paraphrase'),
      mode: z
        .string()
        .optional()
        .describe(
          'Rewriting mode (e.g., "default", "voice_passive", "simplify"). Default: "default"'
        ),
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
        .describe('Number of rewrite variations to generate (default: 1)'),
      sourceLang: z.string().optional().describe('Source language code or "auto"'),
      targetLang: z.string().optional().describe('Target language code for the rewritten text')
    })
  )
  .output(
    z.object({
      rewrites: z
        .array(
          z.object({
            text: z.string().min(1).describe('Rewritten text'),
            index: z.number().describe('Index of this generation')
          })
        )
        .describe('Array of rewritten text variations'),
      ...generationMetadata,
      remainingCredits: z
        .number()
        .optional()
        .describe('Remaining API credits when the balance can be retrieved')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.rewriteText({
      text: ctx.input.text,
      mode: ctx.input.mode,
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
        rewrites: outputs.map(o => ({ text: o.text, index: o.index })),
        balanceWarning: result.balanceWarning,
        completionId: result.completionId,
        model: result.model,
        usage: result.usage,
        remainingCredits: result.data.remaining_credits
      },
      message: `Generated **${outputs.length}** rewritten variation(s) using mode "${ctx.input.mode || 'default'}". ${result.balanceWarning ?? `Remaining credits: ${result.data.remaining_credits}.`}`
    };
  })
  .build();

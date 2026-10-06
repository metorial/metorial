import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { generationMetadata, modelInput } from '../lib/schemas';
import { spec } from '../spec';

export let translateText = SlateTool.create(spec, {
  name: 'Translate Text',
  key: 'translate_text',
  description: `Translate supplied text into another language using a current TextCortex model. Provide text and a target language code to get the translation.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      text: z.string().min(1).describe('The text to translate'),
      model: modelInput,
      maxTokens: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Maximum output tokens (default: 512)'),
      targetLang: z
        .string()
        .describe('Target language code (e.g., "en", "de", "fr", "es", "ja", "zh")'),
      sourceLang: z
        .string()
        .optional()
        .describe('Source language code or "auto" for automatic detection (default: "auto")')
    })
  )
  .output(
    z.object({
      translations: z
        .array(
          z.object({
            text: z.string().min(1).describe('Translated text'),
            index: z.number().describe('Index of this generation')
          })
        )
        .describe('Array of translation outputs'),
      ...generationMetadata,
      remainingCredits: z
        .number()
        .optional()
        .describe('Remaining API credits when the balance can be retrieved')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.translateText({
      text: ctx.input.text,
      model: ctx.input.model,
      maxTokens: ctx.input.maxTokens,
      targetLang: ctx.input.targetLang,
      sourceLang: ctx.input.sourceLang
    });

    let outputs = result.data.outputs;

    return {
      output: {
        translations: outputs.map(o => ({ text: o.text, index: o.index })),
        balanceWarning: result.balanceWarning,
        completionId: result.completionId,
        model: result.model,
        usage: result.usage,
        remainingCredits: result.data.remaining_credits
      },
      message: `Translated text to **${ctx.input.targetLang}**. ${result.balanceWarning ?? `Remaining credits: ${result.data.remaining_credits}.`}`
    };
  })
  .build();

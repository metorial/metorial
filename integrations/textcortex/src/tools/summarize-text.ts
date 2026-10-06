import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { generationMetadata, modelInput } from '../lib/schemas';
import { spec } from '../spec';

export let summarizeText = SlateTool.create(spec, {
  name: 'Summarize Text',
  key: 'summarize_text',
  description: `Summarize supplied text into a concise version using a current TextCortex model. Provide raw text; the current API does not retrieve files by ID or support embeddings summarization.`,
  instructions: [
    'Provide nonempty text and use mode "default". The legacy fileId and embeddings inputs are retained for existing callers but are unsupported by the current API.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      text: z.string().min(1).optional().describe('The text to summarize'),
      fileId: z
        .string()
        .optional()
        .describe(
          'Legacy file ID input; unsupported by the current API. Supply the file contents as text instead'
        ),
      mode: z
        .enum(['default', 'embeddings'])
        .optional()
        .describe(
          'Summarization mode. Use "default"; legacy "embeddings" is unsupported by the current API'
        ),
      model: modelInput,
      maxTokens: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Maximum number of tokens for the summary (default: 512)'),
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
        .describe('Number of summary variations to generate (default: 1)'),
      sourceLang: z.string().optional().describe('Source language code or "auto"'),
      targetLang: z.string().optional().describe('Target language code for the summary')
    })
  )
  .output(
    z.object({
      summaries: z
        .array(
          z.object({
            text: z.string().min(1).describe('Summarized text'),
            index: z.number().describe('Index of this generation')
          })
        )
        .describe('Array of generated summaries'),
      ...generationMetadata,
      remainingCredits: z
        .number()
        .optional()
        .describe('Remaining API credits when the balance can be retrieved')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.summarizeText({
      text: ctx.input.text,
      fileId: ctx.input.fileId,
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
        summaries: outputs.map(o => ({ text: o.text, index: o.index })),
        balanceWarning: result.balanceWarning,
        completionId: result.completionId,
        model: result.model,
        usage: result.usage,
        remainingCredits: result.data.remaining_credits
      },
      message: `Generated **${outputs.length}** summary variation(s). ${result.balanceWarning ?? `Remaining credits: ${result.data.remaining_credits}.`}`
    };
  })
  .build();

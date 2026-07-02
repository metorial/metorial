import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let summarizeText = SlateTool.create(spec, {
  name: 'Summarize Text',
  key: 'summarize_text',
  description: `Summarize text content into a concise version. Accepts either raw text or a file ID from TextCortex. Supports different summarization modes including default and embeddings-based.`,
  instructions: [
    'Provide either "text" or "fileId", not both. If fileId is provided, the text from the file will be summarized.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      text: z.string().optional().describe('The text to summarize'),
      fileId: z
        .string()
        .optional()
        .describe('TextCortex file ID to summarize (alternative to raw text)'),
      mode: z
        .enum(['default', 'embeddings'])
        .optional()
        .describe('Summarization mode. Default: "default"'),
      model: z
        .enum(['velox-1', 'alta-1', 'sophos-1', 'chat-sophos-1'])
        .optional()
        .describe('AI model to use'),
      maxTokens: z
        .number()
        .optional()
        .describe('Maximum number of tokens for the summary (default: 512)'),
      temperature: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Creativity level from 0 to 1. Default: 0.7'),
      generationCount: z
        .number()
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
            text: z.string().describe('Summarized text'),
            index: z.number().describe('Index of this generation')
          })
        )
        .describe('Array of generated summaries'),
      remainingCredits: z.number().describe('Remaining API credits')
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
        remainingCredits: result.data.remaining_credits
      },
      message: `Generated **${outputs.length}** summary variation(s). Remaining credits: ${result.data.remaining_credits}.`
    };
  })
  .build();

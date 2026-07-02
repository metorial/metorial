import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let penaltySchema = z
  .object({
    scale: z.number().describe('Penalty strength'),
    applyToWhitespaces: z.boolean().optional().describe('Apply penalty to whitespace tokens'),
    applyToPunctuations: z
      .boolean()
      .optional()
      .describe('Apply penalty to punctuation tokens'),
    applyToNumbers: z.boolean().optional().describe('Apply penalty to number tokens'),
    applyToStopwords: z.boolean().optional().describe('Apply penalty to stopword tokens'),
    applyToEmojis: z.boolean().optional().describe('Apply penalty to emoji tokens')
  })
  .describe('Penalty configuration');

export let textCompletion = SlateTool.create(spec, {
  name: 'Text Completion',
  key: 'text_completion',
  description: `Generate text completions using AI21's Jurassic-2 models. Provide a prompt and receive one or more continuations. Supports configurable temperature, penalties, and stop sequences.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      model: z.enum(['j2-light', 'j2-mid', 'j2-ultra']).describe('Jurassic-2 model to use'),
      prompt: z.string().describe('Text prompt to complete'),
      maxTokens: z.number().int().optional().describe('Maximum tokens in the completion'),
      temperature: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Sampling temperature (0.0-1.0)'),
      topP: z.number().min(0).max(1).optional().describe('Nucleus sampling threshold'),
      numResults: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe('Number of completions to generate'),
      stopSequences: z.array(z.string()).optional().describe('Sequences that stop generation'),
      presencePenalty: penaltySchema.optional().describe('Penalty for tokens already present'),
      countPenalty: penaltySchema.optional().describe('Penalty proportional to token count'),
      frequencyPenalty: penaltySchema
        .optional()
        .describe('Penalty proportional to token frequency')
    })
  )
  .output(
    z.object({
      completionId: z.string().describe('Unique request identifier'),
      completions: z
        .array(
          z.object({
            text: z.string().describe('Generated completion text'),
            finishReason: z.string().optional().describe('Reason generation stopped')
          })
        )
        .describe('Generated completions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.textCompletion({
      model: ctx.input.model,
      prompt: ctx.input.prompt,
      maxTokens: ctx.input.maxTokens,
      temperature: ctx.input.temperature,
      topP: ctx.input.topP,
      numResults: ctx.input.numResults,
      stopSequences: ctx.input.stopSequences,
      presencePenalty: ctx.input.presencePenalty,
      countPenalty: ctx.input.countPenalty,
      frequencyPenalty: ctx.input.frequencyPenalty
    });

    let completions = (result.completions ?? []).map((c: any) => ({
      text: c.data?.text ?? '',
      finishReason: c.finishReason?.reason ?? c.finish_reason
    }));

    let output = {
      completionId: result.id,
      completions
    };

    let firstText = completions[0]?.text ?? '';
    let preview = firstText.substring(0, 200) + (firstText.length > 200 ? '...' : '');

    return {
      output,
      message: `Generated **${completions.length}** completion(s) using **${ctx.input.model}**.\n\n> ${preview}`
    };
  })
  .build();

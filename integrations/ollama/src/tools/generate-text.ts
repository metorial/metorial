import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  keepAliveSchema,
  logprobSchema,
  modelOptionsSchema,
  thinkSchema
} from '../lib/schemas';
import { spec } from '../spec';

export let generateText = SlateTool.create(spec, {
  name: 'Generate Text',
  key: 'generate_text',
  description: `Generate a text completion from a prompt using a specified model. Supports system prompts, multimodal inputs (base64 images for vision models), structured output via JSON schema, and reasoning/thinking output. Use this for single-turn text generation tasks.`,
  instructions: [
    'Set the **format** parameter to `"json"` for freeform JSON output, or provide a JSON schema object for structured outputs.',
    'For vision models, provide images as base64-encoded strings in the **images** array.',
    "Enable **think** to get the model's reasoning process alongside the response."
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      model: z.string().describe('Name of the model to use (e.g., "llama3.2", "gemma3").'),
      prompt: z.string().describe('The input prompt for text generation.'),
      suffix: z
        .string()
        .optional()
        .describe('Text after the insertion point for fill-in-the-middle models.'),
      system: z
        .string()
        .optional()
        .describe('System-level instructions to guide model behavior.'),
      images: z
        .array(z.string())
        .optional()
        .describe('Base64-encoded images for vision-capable models.'),
      format: z
        .any()
        .optional()
        .describe(
          'Output format: "json" for JSON mode, or a JSON schema object for structured output.'
        ),
      think: thinkSchema,
      logprobs: z
        .boolean()
        .optional()
        .describe('Return log probabilities for generated tokens.'),
      topLogprobs: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Number of likely alternative tokens to return when logprobs is enabled.'),
      raw: z
        .boolean()
        .optional()
        .describe('Skip prompt templating and pass the prompt directly.'),
      keepAlive: keepAliveSchema,
      options: modelOptionsSchema
    })
  )
  .output(
    z.object({
      model: z.string().describe('Model used for generation.'),
      createdAt: z.string().describe('ISO 8601 timestamp of the response.'),
      response: z.string().describe('The generated text.'),
      thinking: z
        .string()
        .optional()
        .describe("The model's reasoning process, if think was enabled."),
      done: z.boolean().describe('Whether generation is complete.'),
      doneReason: z.string().optional().describe('Reason generation stopped.'),
      totalDuration: z.number().optional().describe('Total time in nanoseconds.'),
      promptEvalCount: z.number().optional().describe('Number of prompt tokens evaluated.'),
      evalCount: z.number().optional().describe('Number of tokens generated.'),
      logprobs: z
        .array(logprobSchema)
        .optional()
        .describe('Log probability information when logprobs was requested.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let result = await client.generate({
      model: ctx.input.model,
      prompt: ctx.input.prompt,
      suffix: ctx.input.suffix,
      system: ctx.input.system,
      images: ctx.input.images,
      format: ctx.input.format,
      think: ctx.input.think,
      logprobs: ctx.input.logprobs,
      topLogprobs: ctx.input.topLogprobs,
      raw: ctx.input.raw,
      keepAlive: ctx.input.keepAlive,
      options: ctx.input.options
    });

    let tokenInfo = result.evalCount ? ` Generated **${result.evalCount}** tokens.` : '';

    return {
      output: {
        model: result.model,
        createdAt: result.createdAt,
        response: result.response,
        thinking: result.thinking,
        done: result.done,
        doneReason: result.doneReason,
        totalDuration: result.totalDuration,
        promptEvalCount: result.promptEvalCount,
        evalCount: result.evalCount,
        logprobs: result.logprobs
      },
      message: `Generated text using **${result.model}**.${tokenInfo}`
    };
  })
  .build();

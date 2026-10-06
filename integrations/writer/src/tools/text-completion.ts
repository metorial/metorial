import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { WriterClient } from '../lib/client';
import { spec } from '../spec';

export let textCompletion = SlateTool.create(spec, {
  name: 'Text Completion',
  key: 'text_completion',
  description: `Generate text from a single prompt using Writer's Palmyra models. Unlike chat completion, this takes a plain text prompt and returns a text continuation. Best for single-turn text generation tasks like summarization, rewriting, or content creation.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      model: z
        .enum([
          'palmyra-x6',
          'palmyra-x5',
          'palmyra-x4',
          'palmyra-fin',
          'palmyra-med',
          'palmyra-creative',
          'palmyra-x-003-instruct'
        ])
        .optional()
        .describe('Palmyra model to use. Choose this or modelId.'),
      modelId: z
        .string()
        .min(1)
        .optional()
        .describe(
          'Available model ID from list_models, including external models. Choose this or model.'
        ),
      prompt: z.string().describe('Input text prompt for the model to complete'),
      temperature: z
        .number()
        .min(0)
        .max(2)
        .optional()
        .describe('Controls randomness (0 = deterministic, 2 = creative). Default: 1'),
      maxTokens: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Maximum number of tokens to generate'),
      topP: z.number().min(0).max(1).optional().describe('Nucleus sampling threshold (0-1)'),
      stop: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe('Stop sequence(s) that halt generation'),
      bestOf: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Generate multiple completions and return the best one'),
      randomSeed: z.number().int().optional().describe('Seed for reproducible outputs')
    })
  )
  .output(
    z.object({
      model: z.string().describe('Model used for generation'),
      completions: z
        .array(
          z.object({
            text: z.string().describe('Generated text')
          })
        )
        .describe('Generated text completions')
    })
  )
  .handleInvocation(async ctx => {
    if ((ctx.input.model === undefined) === (ctx.input.modelId === undefined))
      throw createApiServiceError(
        'Provide either model or modelId. Call list_models to discover available IDs.'
      );
    let model = ctx.input.modelId ?? ctx.input.model;
    if (!model)
      throw createApiServiceError(
        'Choose a model using list_models before generating content.'
      );
    let client = new WriterClient(ctx.auth.token);

    ctx.progress('Generating text completion...');

    let result = await client.textCompletion({
      model,
      prompt: ctx.input.prompt,
      temperature: ctx.input.temperature,
      maxTokens: ctx.input.maxTokens,
      topP: ctx.input.topP,
      stop: ctx.input.stop,
      bestOf: ctx.input.bestOf,
      randomSeed: ctx.input.randomSeed,
      stream: false
    });

    let completions = result.choices.map(c => ({ text: c.text }));
    let firstText = completions[0]?.text || '';
    let preview = firstText.length > 200 ? `${firstText.substring(0, 200)}...` : firstText;

    return {
      output: {
        model: result.model,
        completions
      },
      message: `Generated **${completions.length}** completion(s) using **${result.model}**.\n\n> ${preview}`
    };
  })
  .build();

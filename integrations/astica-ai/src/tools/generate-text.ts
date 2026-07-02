import { SlateTool } from 'slates';
import { z } from 'zod';
import { AsticaNlpClient } from '../lib/client';
import { spec } from '../spec';

export let generateTextTool = SlateTool.create(spec, {
  name: 'Generate Text',
  key: 'generate_text',
  description: `Generate text using Astica's GPT-S natural language processing engine. Produces human-like text, answers questions, creates stories, and generates diverse content based on prompts.
Supports configurable temperature, token limits, and optional system instructions for controlling output behavior.`,
  instructions: [
    'Provide a prompt in the "prompt" field describing what text to generate.',
    'Use "instruction" to set a system-level instruction for guiding the generation behavior.',
    'Adjust temperature (0-1) and topP for controlling creativity vs. predictability.'
  ],
  constraints: ['GPT-S output is not filtered or moderated.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      prompt: z.string().describe('The text prompt for generation'),
      instruction: z
        .string()
        .optional()
        .describe('System-level instruction to guide the generation behavior'),
      temperature: z
        .number()
        .optional()
        .describe(
          'Controls randomness (0.0 = deterministic, 1.0 = creative). Defaults to 0.7.'
        ),
      topP: z
        .number()
        .optional()
        .describe('Nucleus sampling parameter (0.0-1.0). Defaults to 0.35.'),
      tokenLimit: z
        .number()
        .optional()
        .describe('Maximum number of tokens to generate. Defaults to 256.'),
      stopSequence: z.string().optional().describe('String at which to stop generation'),
      thinkPass: z.number().optional().describe('Number of thinking passes. Defaults to 1.'),
      lowPriority: z.boolean().optional().describe('Use low-priority mode for lower cost')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status'),
      generatedText: z.string().describe('The generated text output'),
      rawResponse: z.any().optional().describe('Full raw response data from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AsticaNlpClient(ctx.auth.token);

    ctx.info(`Generating text for prompt: "${ctx.input.prompt.substring(0, 80)}..."`);

    let result = await client.generate({
      input: ctx.input.prompt,
      instruction: ctx.input.instruction,
      temperature: ctx.input.temperature,
      topP: ctx.input.topP,
      tokenLimit: ctx.input.tokenLimit,
      stopSequence: ctx.input.stopSequence,
      thinkPass: ctx.input.thinkPass,
      lowPriority: ctx.input.lowPriority ? 1 : 0
    });

    let generatedText = result.output || '';

    return {
      output: {
        status: result.status || 'unknown',
        generatedText,
        rawResponse: result
      },
      message: generatedText
        ? `Text generated successfully: "${generatedText.substring(0, 200)}${generatedText.length > 200 ? '...' : ''}"`
        : `Text generation completed. Status: ${result.status || 'unknown'}.`
    };
  })
  .build();

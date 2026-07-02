import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let lemurTask = SlateTool.create(spec, {
  name: 'LeMUR Task',
  key: 'lemur_task',
  description: `Apply a large language model to one or more transcripts using AssemblyAI's LeMUR framework. Submit a custom prompt along with transcript IDs or raw text input, and receive an LLM-generated response.
Use this for summarizing transcripts, extracting insights, answering questions about audio content, generating action items, or any custom analysis task.
Supports multiple LLM providers including Claude, GPT, and Gemini models.`,
  instructions: [
    'Provide either transcriptIds (for transcripts already on AssemblyAI) or inputText (for custom text input), not both.',
    'The prompt should clearly describe what you want the LLM to do with the transcript data.'
  ],
  constraints: [
    'Up to 100 transcript IDs or 100 hours of audio can be processed per request.',
    'LeMUR is not supported on the EU endpoint.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      prompt: z
        .string()
        .describe('The LLM prompt describing what to do with the transcript data.'),
      transcriptIds: z
        .array(z.string())
        .optional()
        .describe('List of completed transcript IDs to process.'),
      inputText: z
        .string()
        .optional()
        .describe('Custom text input to process (alternative to transcriptIds).'),
      finalModel: z
        .string()
        .optional()
        .describe(
          'LLM model to use (e.g., "anthropic/claude-3-5-sonnet", "openai/gpt-4o"). Defaults to the platform default.'
        ),
      maxOutputSize: z.number().optional().describe('Maximum output size in tokens.'),
      temperature: z
        .number()
        .optional()
        .describe('Model temperature (higher = more creative, lower = more conservative).')
    })
  )
  .output(
    z.object({
      requestId: z
        .string()
        .describe('The LeMUR request ID. Can be used to purge the data later.'),
      response: z.string().describe('The LLM-generated response text.'),
      usage: z
        .object({
          inputTokens: z.number().optional().describe('Number of input tokens used.'),
          outputTokens: z.number().optional().describe('Number of output tokens generated.')
        })
        .optional()
        .describe('Token usage information.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.lemurTask({
      prompt: ctx.input.prompt,
      transcriptIds: ctx.input.transcriptIds,
      inputText: ctx.input.inputText,
      finalModel: ctx.input.finalModel,
      maxOutputSize: ctx.input.maxOutputSize,
      temperature: ctx.input.temperature
    });

    return {
      output: {
        requestId: result.request_id,
        response: result.response,
        usage: result.usage
          ? {
              inputTokens: result.usage.input_tokens,
              outputTokens: result.usage.output_tokens
            }
          : undefined
      },
      message: `LeMUR task completed. Request ID: **${result.request_id}**.`
    };
  })
  .build();

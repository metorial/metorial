import { SlateTool } from 'slates';
import { z } from 'zod';
import { rejectHumanloopOperation } from '../lib/retirement';
import { spec } from '../spec';

export let logPromptResult = SlateTool.create(spec, {
  name: 'Log Prompt Result',
  key: 'log_prompt_result',
  description:
    'DEPRECATED — Humanloop shut down on September 8, 2025. This operation is unavailable; the tool is retained only for compatibility.',
  instructions: [
    'Humanloop is retired. Do not use this tool for new workflows; use data exported before September 8, 2025 with your chosen replacement platform.'
  ],
  tags: {
    destructive: false,
    readOnly: false,
    deprecated: true
  }
})
  .input(
    z.object({
      promptId: z.string().optional().describe('ID of the prompt to log against'),
      path: z.string().optional().describe('Path of the prompt to log against'),
      versionId: z.string().optional().describe('Specific version ID to log against'),
      inputs: z
        .record(z.string(), z.any())
        .optional()
        .describe('Input variables used for the call'),
      output: z.string().optional().describe('Generated text output from the model'),
      outputMessage: z
        .object({
          role: z.string().describe('Role of the message'),
          content: z.string().describe('Content of the message'),
          toolCalls: z.array(z.any()).optional().describe('Tool calls in the message')
        })
        .optional()
        .describe('Full output message object'),
      messages: z
        .array(
          z.object({
            role: z.string().describe('Role of the message'),
            content: z.string().describe('Content of the message')
          })
        )
        .optional()
        .describe('Conversation messages'),
      error: z.string().optional().describe('Error message if the call failed'),
      promptTokens: z.number().optional().describe('Number of input tokens'),
      outputTokens: z.number().optional().describe('Number of output tokens'),
      promptCost: z.number().optional().describe('Cost of the prompt tokens'),
      outputCost: z.number().optional().describe('Cost of the output tokens'),
      latency: z.number().optional().describe('Latency in seconds'),
      traceParentId: z.string().optional().describe('Parent log ID for trace linking'),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional metadata to attach')
    })
  )
  .output(
    z.object({
      logId: z.string().describe('ID of the created log'),
      raw: z.any().optional().describe('Full response from the API')
    })
  )
  .handleInvocation(async () => rejectHumanloopOperation())
  .build();

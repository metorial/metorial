import { SlateTool } from 'slates';
import { z } from 'zod';
import { rejectHumanloopOperation } from '../lib/retirement';
import { spec } from '../spec';

export let callPrompt = SlateTool.create(spec, {
  name: 'Call Prompt',
  key: 'call_prompt',
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
      promptId: z.string().optional().describe('ID of the prompt to call'),
      path: z.string().optional().describe('Path of the prompt to call'),
      versionId: z.string().optional().describe('Specific version ID to call'),
      inputs: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Input variables to populate the template (key-value pairs matching {{variable}} placeholders)'
        ),
      messages: z
        .array(
          z.object({
            role: z
              .enum(['system', 'user', 'assistant', 'tool'])
              .describe('Role of the message sender'),
            content: z.string().describe('Content of the message'),
            name: z.string().optional().describe('Name of the sender')
          })
        )
        .optional()
        .describe('Additional messages to append to the conversation'),
      providerApiKeys: z
        .record(z.string(), z.string())
        .optional()
        .describe('Provider API keys (e.g. {"openai": "sk-...", "anthropic": "sk-ant-..."})'),
      numSamples: z.number().optional().describe('Number of samples to generate'),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional metadata to attach to the log')
    })
  )
  .output(
    z.object({
      logId: z.string().optional().describe('ID of the generated log'),
      output: z.string().optional().describe('Generated text output'),
      outputMessage: z.any().optional().describe('Full output message object'),
      finishReason: z.string().optional().describe('Reason the model stopped generating'),
      usage: z.any().optional().describe('Token usage information'),
      raw: z.any().optional().describe('Full response from the API')
    })
  )
  .handleInvocation(async () => rejectHumanloopOperation())
  .build();

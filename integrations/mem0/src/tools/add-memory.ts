import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let addMemory = SlateTool.create(spec, {
  name: 'Add Memory',
  key: 'add_memory',
  description: `Store new memories from conversation messages using Mem0's V3 additive pipeline. Inference is processed asynchronously; use get_event to check completion. Disable inference to store messages directly. Memories must be scoped to a user, agent, app, or run.`,
  instructions: [
    'Messages must follow OpenAI chat format with "role" and "content" fields.',
    'Provide at least one scope identifier (userId, agentId, appId, or runId).',
    'Set infer to false to store messages as-is without LLM extraction.',
    'For asynchronous processing, retain eventId and call get_event until status is SUCCEEDED or FAILED.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      messages: z
        .array(
          z.object({
            role: z
              .string()
              .describe('Role of the message sender (e.g., "user", "assistant", "system")'),
            content: z.string().describe('Content of the message')
          })
        )
        .min(1)
        .describe('Conversation messages in OpenAI chat format'),
      userId: z.string().trim().min(1).optional().describe('User ID to scope the memory to'),
      agentId: z.string().trim().min(1).optional().describe('Agent ID to scope the memory to'),
      appId: z.string().trim().min(1).optional().describe('App ID to scope the memory to'),
      runId: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Run/session ID to scope the memory to'),
      metadata: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom key-value metadata to attach to the memory'),
      infer: z
        .boolean()
        .optional()
        .describe(
          'Whether to use LLM to extract facts (default: true). Set to false to store as-is.'
        ),
      enableGraph: z
        .boolean()
        .optional()
        .describe('Enable graph memory to extract entities and relationships'),
      memoryType: z
        .string()
        .optional()
        .describe('Legacy option not supported by the hosted V3 API. Omit this field.'),
      expirationDate: z.iso
        .date()
        .optional()
        .describe('Date after which the memory is hidden from search, YYYY-MM-DD'),
      customInstructions: z
        .string()
        .optional()
        .describe('Instructions guiding memory extraction for this request')
    })
  )
  .output(
    z.object({
      eventId: z
        .string()
        .optional()
        .describe('Processing event ID. Call get_event to check completion.'),
      status: z
        .string()
        .describe('Processing status; PENDING means the memories are not ready yet'),
      events: z
        .array(
          z.object({
            memoryId: z
              .string()
              .trim()
              .min(1)
              .describe('Unique identifier of the created/affected memory'),
            event: z.string().describe('Event type: ADD, UPDATE, or DELETE'),
            memory: z.string().describe('The processed memory text')
          })
        )
        .describe('List of memory events resulting from the add operation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      legacyScope: ctx.config
    });

    let result = await client.addMemory({
      messages: ctx.input.messages,
      userId: ctx.input.userId,
      agentId: ctx.input.agentId,
      appId: ctx.input.appId,
      runId: ctx.input.runId,
      metadata: ctx.input.metadata,
      infer: ctx.input.infer,
      enableGraph: ctx.input.enableGraph,
      memoryType: ctx.input.memoryType,
      expirationDate: ctx.input.expirationDate,
      customInstructions: ctx.input.customInstructions
    });

    let events = result.events;

    let addCount = events.filter(e => e.event === 'ADD').length;
    let updateCount = events.filter(e => e.event === 'UPDATE').length;
    let deleteCount = events.filter(e => e.event === 'DELETE').length;

    let parts: string[] = [];
    if (addCount > 0) parts.push(`${addCount} added`);
    if (updateCount > 0) parts.push(`${updateCount} updated`);
    if (deleteCount > 0) parts.push(`${deleteCount} deleted`);

    return {
      output: { events, eventId: result.eventId, status: result.status },
      message:
        result.status === 'PENDING' || result.status === 'RUNNING'
          ? `Memory processing is ${result.status.toLowerCase()}. Call get_event with eventId ${result.eventId} to check completion.`
          : `Processed ${events.length} memory event(s): ${parts.join(', ') || 'none'}.`
    };
  })
  .build();

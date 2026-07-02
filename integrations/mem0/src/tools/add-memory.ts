import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let addMemory = SlateTool.create(spec, {
  name: 'Add Memory',
  key: 'add_memory',
  description: `Store new memories from conversation messages. Mem0 uses an LLM to extract facts from the messages and stores them as memories. You can optionally store messages directly without extraction by disabling inference.
Memories can be scoped to a specific user, agent, app, or session (run). Supports graph memory for relationship extraction.`,
  instructions: [
    'Messages must follow OpenAI chat format with "role" and "content" fields.',
    'At least one scope identifier (userId, agentId, appId, or runId) should be provided to organize memories.',
    'Set infer to false to store messages as-is without LLM extraction.',
    'Set memoryType to "procedural_memory" for step-by-step knowledge (requires agentId).'
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
        .describe('Conversation messages in OpenAI chat format'),
      userId: z.string().optional().describe('User ID to scope the memory to'),
      agentId: z.string().optional().describe('Agent ID to scope the memory to'),
      appId: z.string().optional().describe('App ID to scope the memory to'),
      runId: z.string().optional().describe('Run/session ID to scope the memory to'),
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
        .describe(
          'Memory type, e.g. "procedural_memory" for step-by-step knowledge (requires agentId)'
        )
    })
  )
  .output(
    z.object({
      events: z
        .array(
          z.object({
            memoryId: z.string().describe('Unique identifier of the created/affected memory'),
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
      orgId: ctx.config.orgId,
      projectId: ctx.config.projectId
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
      memoryType: ctx.input.memoryType
    });

    let events = (Array.isArray(result) ? result : []).map(e => ({
      memoryId: e.id,
      event: e.event,
      memory: e.data?.memory || ''
    }));

    let addCount = events.filter(e => e.event === 'ADD').length;
    let updateCount = events.filter(e => e.event === 'UPDATE').length;
    let deleteCount = events.filter(e => e.event === 'DELETE').length;

    let parts: string[] = [];
    if (addCount > 0) parts.push(`${addCount} added`);
    if (updateCount > 0) parts.push(`${updateCount} updated`);
    if (deleteCount > 0) parts.push(`${deleteCount} deleted`);

    return {
      output: { events },
      message: `Processed ${events.length} memory event(s): ${parts.join(', ') || 'none'}.`
    };
  })
  .build();

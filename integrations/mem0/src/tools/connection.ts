import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const getCurrentUser = SlateTool.create(spec, {
  key: 'get_current_user',
  name: 'Get Current User',
  description:
    'Validate the connected API key and discover its user email, organization, and project. Memory operations use the project associated with this API key.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      status: z.string().describe('API key validation status'),
      userEmail: z.string().trim().min(1).optional().describe('Email of the API key owner'),
      orgId: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Organization associated with the API key'),
      projectId: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Project associated with the API key')
    })
  )
  .handleInvocation(async ctx => ({
    output: await new Client({
      token: ctx.auth.token,
      legacyScope: ctx.config
    }).getCurrentUser(),
    message: 'Retrieved the connected Mem0 identity.'
  }))
  .build();

export const getEvent = SlateTool.create(spec, {
  key: 'get_event',
  name: 'Get Event',
  description:
    'Check whether an asynchronous memory addition or deletion has completed. Returns status, processed memory events, and provider failure details.',
  instructions: [
    'Call this tool with the eventId returned by add_memory, delete_memories, or delete_entity. PENDING and RUNNING indicate processing is still in progress.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      eventId: z
        .string()
        .trim()
        .min(1)
        .describe('Processing event ID returned by a memory operation')
    })
  )
  .output(
    z.object({
      eventId: z.string(),
      eventType: z.string(),
      status: z.string().describe('Processing status: PENDING, RUNNING, SUCCEEDED, or FAILED'),
      events: z.array(
        z.object({ memoryId: z.string(), event: z.string(), memory: z.string() })
      ),
      results: z
        .array(z.unknown())
        .describe('Provider results, including mutation identifiers'),
      error: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Provider failure message when processing failed'),
      createdAt: z.string().trim().min(1).optional(),
      completedAt: z.string().trim().min(1).optional()
    })
  )
  .handleInvocation(async ctx => {
    const output = await new Client({
      token: ctx.auth.token,
      legacyScope: ctx.config
    }).getEvent(ctx.input.eventId);
    return { output, message: `Memory operation status: ${output.status}.` };
  })
  .build();

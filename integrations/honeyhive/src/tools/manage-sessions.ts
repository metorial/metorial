import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let startSession = SlateTool.create(spec, {
  name: 'Start Session',
  key: 'start_session',
  description: `Start a new tracing session in HoneyHive. A session represents a complete interaction or request and serves as the root of a trace tree. Child events (model, tool, chain) can be attached to it.`,
  instructions: [
    'The "source" field should indicate the environment, e.g., "production", "staging", or "playground".'
  ]
})
  .input(
    z.object({
      project: z
        .string()
        .optional()
        .describe(
          'Legacy project selector retained for compatibility. The connection API key determines the project; this value does not change its scope.'
        ),
      sessionName: z.string().describe('Name for the session'),
      source: z
        .string()
        .default('production')
        .describe('Source environment (e.g., "production", "staging", "playground")'),
      sessionId: z
        .string()
        .optional()
        .describe('Custom session ID. Auto-generated if not provided.'),
      inputs: z.record(z.string(), z.any()).optional().describe('Input data for the session'),
      outputs: z
        .record(z.string(), z.any())
        .optional()
        .describe('Output data for the session'),
      error: z
        .string()
        .optional()
        .describe(
          'Legacy field unavailable on the current session API; use log_event to record child-event errors.'
        ),
      duration: z.number().optional().describe('Duration of the session in milliseconds'),
      userProperties: z
        .record(z.string(), z.any())
        .optional()
        .describe('User properties associated with this session'),
      metadata: z.record(z.string(), z.any()).optional().describe('Additional metadata'),
      startTime: z
        .number()
        .optional()
        .describe('Epoch timestamp in milliseconds for session start'),
      endTime: z
        .number()
        .optional()
        .describe('Epoch timestamp in milliseconds for session end')
    })
  )
  .output(
    z.object({
      sessionId: z.string().describe('Session correlation ID for child events'),
      eventId: z
        .string()
        .optional()
        .describe('Session event row ID; use this ID with update_event or post_feedback')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      serverUrl: ctx.config.serverUrl
    });

    let project = ctx.input.project || ctx.config.project;

    let data = await client.startSession({
      project,
      session_name: ctx.input.sessionName,
      source: ctx.input.source,
      session_id: ctx.input.sessionId,
      inputs: ctx.input.inputs,
      outputs: ctx.input.outputs,
      error: ctx.input.error,
      duration: ctx.input.duration,
      user_properties: ctx.input.userProperties,
      metadata: ctx.input.metadata,
      start_time: ctx.input.startTime,
      end_time: ctx.input.endTime
    });

    return {
      output: { sessionId: data.session_id, eventId: data.event_id },
      message: `Started session **${ctx.input.sessionName}** with ID \`${data.session_id}\`.`
    };
  })
  .build();

export let getSession = SlateTool.create(spec, {
  name: 'Get Session',
  key: 'get_session',
  description: `Retrieve a session by ID, including its trace fields and child event IDs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sessionId: z.string().describe('ID of the session to retrieve')
    })
  )
  .output(
    z.object({
      sessionId: z.string().describe('Session correlation ID'),
      eventId: z.string().optional().describe('Session event row ID'),
      project: z.string().optional().describe('Project name'),
      projectId: z.string().optional().describe('Project ID returned by the provider'),
      sessionName: z.string().optional().describe('Session name'),
      source: z.string().optional().describe('Source environment'),
      inputs: z.record(z.string(), z.any()).optional().describe('Session input data'),
      outputs: z.record(z.string(), z.any()).optional().describe('Session output data'),
      error: z.string().optional().describe('Error message if failed'),
      duration: z.number().optional().describe('Duration in milliseconds'),
      metadata: z.record(z.string(), z.any()).optional().describe('Session metadata'),
      children: z.array(z.any()).optional().describe('Nested child events')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      serverUrl: ctx.config.serverUrl
    });

    let data = await client.getSession(ctx.input.sessionId);
    if (!data?.event_id && !data?.session_id)
      throw createApiServiceError('HoneyHive did not return the requested session.', {
        reason: 'honeyhive_invalid_response'
      });

    return {
      output: {
        sessionId: data?.session_id || ctx.input.sessionId,
        eventId: data?.event_id,
        project: data?.project,
        projectId: data?.project_id,
        sessionName: data?.event_name || data?.session_name || undefined,
        source: data?.source ?? undefined,
        inputs: data?.inputs ?? undefined,
        outputs: data?.outputs ?? undefined,
        error: data?.error ?? undefined,
        duration: data?.duration ?? undefined,
        metadata: data?.metadata ?? undefined,
        children: data?.children || data?.children_ids
      },
      message: `Retrieved session \`${ctx.input.sessionId}\`.`
    };
  })
  .build();

export let deleteSession = SlateTool.create(spec, {
  name: 'Delete Session',
  key: 'delete_session',
  description: `DEPRECATED — unavailable: HoneyHive does not document an API for deleting individual sessions. Retained for existing workflows; invoking this tool reports the provider limitation.`,
  tags: {
    destructive: true,
    deprecated: true
  }
})
  .input(
    z.object({
      sessionId: z.string().describe('ID of the session to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async () => {
    throw createApiServiceError(
      'HoneyHive does not document a session deletion API. This operation is unavailable.',
      { reason: 'honeyhive_unsupported_operation' }
    );
  })
  .build();

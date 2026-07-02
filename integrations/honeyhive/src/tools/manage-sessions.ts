import { SlateTool } from 'slates';
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
        .describe('Project name. Falls back to the configured default project.'),
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
      error: z.string().optional().describe('Error message if the session failed'),
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
      sessionId: z.string().describe('ID of the newly created session')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      serverUrl: ctx.config.serverUrl
    });

    let project = ctx.input.project || ctx.config.project;
    if (!project) {
      throw new Error(
        'Project name is required. Provide it in the input or set a default in the configuration.'
      );
    }

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
      output: { sessionId: data.session_id },
      message: `Started session **${ctx.input.sessionName}** with ID \`${data.session_id}\`.`
    };
  })
  .build();

export let getSession = SlateTool.create(spec, {
  name: 'Get Session',
  key: 'get_session',
  description: `Retrieve a session and its full trace tree by session ID. Returns the session event along with all nested child events (model, tool, chain).`,
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
      sessionId: z.string().describe('Session ID'),
      project: z.string().optional().describe('Project name'),
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

    let data = await client.getSessionTree(ctx.input.sessionId);

    return {
      output: {
        sessionId: data?.event_id || data?.session_id || ctx.input.sessionId,
        project: data?.project,
        sessionName: data?.event_name || data?.session_name,
        source: data?.source,
        inputs: data?.inputs,
        outputs: data?.outputs,
        error: data?.error,
        duration: data?.duration,
        metadata: data?.metadata,
        children: data?.children || data?.children_ids
      },
      message: `Retrieved session \`${ctx.input.sessionId}\`.`
    };
  })
  .build();

export let deleteSession = SlateTool.create(spec, {
  name: 'Delete Session',
  key: 'delete_session',
  description: `Delete a session and all of its events by session ID.`,
  tags: {
    destructive: true
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
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      serverUrl: ctx.config.serverUrl
    });

    await client.deleteSession(ctx.input.sessionId);

    return {
      output: { success: true },
      message: `Deleted session \`${ctx.input.sessionId}\` and all its events.`
    };
  })
  .build();

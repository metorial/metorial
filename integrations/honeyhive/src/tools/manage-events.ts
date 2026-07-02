import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let logEvent = SlateTool.create(spec, {
  name: 'Log Event',
  key: 'log_event',
  description: `Log a single trace event (model, tool, or chain) in HoneyHive. Events are nested within sessions to build a distributed trace. Use this to record individual LLM calls, tool invocations, or chain steps.`,
  instructions: [
    'Use "model" event type for LLM inference calls, "tool" for external API/DB calls, and "chain" for composable step groups.'
  ]
})
  .input(
    z.object({
      project: z
        .string()
        .optional()
        .describe('Project name. Falls back to the configured default project.'),
      eventType: z.enum(['model', 'tool', 'chain']).describe('Type of event'),
      eventName: z.string().describe('Name identifying this event'),
      source: z.string().default('production').describe('Source environment'),
      eventConfig: z
        .record(z.string(), z.any())
        .describe('Configuration for the event (model params, tool config, etc.)'),
      inputs: z.record(z.string(), z.any()).describe('Input data for the event'),
      duration: z.number().describe('Duration of the event in milliseconds'),
      sessionId: z.string().optional().describe('Session ID to attach this event to'),
      parentId: z.string().optional().describe('Parent event ID for nesting'),
      outputs: z.record(z.string(), z.any()).optional().describe('Output data from the event'),
      error: z.string().optional().describe('Error message if the event failed'),
      startTime: z.number().optional().describe('Epoch timestamp in ms for event start'),
      endTime: z.number().optional().describe('Epoch timestamp in ms for event end'),
      metadata: z.record(z.string(), z.any()).optional().describe('Additional metadata'),
      feedback: z.record(z.string(), z.any()).optional().describe('Feedback for the event'),
      metrics: z.record(z.string(), z.any()).optional().describe('Metrics for the event'),
      userProperties: z.record(z.string(), z.any()).optional().describe('User properties')
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('ID of the created event'),
      success: z.boolean().describe('Whether the event was logged successfully')
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

    let data = await client.createEvent({
      project,
      event_type: ctx.input.eventType,
      event_name: ctx.input.eventName,
      source: ctx.input.source,
      config: ctx.input.eventConfig,
      inputs: ctx.input.inputs,
      duration: ctx.input.duration,
      session_id: ctx.input.sessionId,
      parent_id: ctx.input.parentId,
      outputs: ctx.input.outputs,
      error: ctx.input.error,
      start_time: ctx.input.startTime,
      end_time: ctx.input.endTime,
      metadata: ctx.input.metadata,
      feedback: ctx.input.feedback,
      metrics: ctx.input.metrics,
      user_properties: ctx.input.userProperties
    });

    return {
      output: {
        eventId: data.event_id,
        success: data.success ?? true
      },
      message: `Logged **${ctx.input.eventType}** event **${ctx.input.eventName}** with ID \`${data.event_id}\`.`
    };
  })
  .build();

export let updateEvent = SlateTool.create(spec, {
  name: 'Update Event',
  key: 'update_event',
  description: `Update an existing event's metadata, feedback, metrics, outputs, or other fields. Use this to enrich trace data after the fact, such as attaching user feedback or quality metrics.`
})
  .input(
    z.object({
      eventId: z.string().describe('ID of the event to update'),
      metadata: z.record(z.string(), z.any()).optional().describe('Updated metadata'),
      feedback: z
        .record(z.string(), z.any())
        .optional()
        .describe('Feedback to attach (e.g., { "rating": 5 })'),
      metrics: z.record(z.string(), z.any()).optional().describe('Metrics to attach'),
      outputs: z.record(z.string(), z.any()).optional().describe('Updated output data'),
      eventConfig: z.record(z.string(), z.any()).optional().describe('Updated configuration'),
      userProperties: z
        .record(z.string(), z.any())
        .optional()
        .describe('Updated user properties'),
      duration: z.number().optional().describe('Updated duration in milliseconds')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      serverUrl: ctx.config.serverUrl
    });

    await client.updateEvent({
      event_id: ctx.input.eventId,
      metadata: ctx.input.metadata,
      feedback: ctx.input.feedback,
      metrics: ctx.input.metrics,
      outputs: ctx.input.outputs,
      config: ctx.input.eventConfig,
      user_properties: ctx.input.userProperties,
      duration: ctx.input.duration
    });

    return {
      output: { success: true },
      message: `Updated event \`${ctx.input.eventId}\`.`
    };
  })
  .build();

export let logEventBatch = SlateTool.create(spec, {
  name: 'Log Event Batch',
  key: 'log_event_batch',
  description: `Log multiple trace events in a single batch request. Efficient for high-volume ingestion. All events can optionally share a single session.`,
  constraints: ['All events in the batch must belong to the same project.']
})
  .input(
    z.object({
      events: z
        .array(
          z.object({
            project: z
              .string()
              .optional()
              .describe('Project name (can be omitted if all events share the same project)'),
            eventType: z.enum(['model', 'tool', 'chain']).describe('Type of event'),
            eventName: z.string().describe('Name of the event'),
            source: z.string().default('production').describe('Source environment'),
            eventConfig: z.record(z.string(), z.any()).describe('Event configuration'),
            inputs: z.record(z.string(), z.any()).describe('Input data'),
            duration: z.number().describe('Duration in milliseconds'),
            sessionId: z.string().optional().describe('Session ID'),
            parentId: z.string().optional().describe('Parent event ID'),
            outputs: z.record(z.string(), z.any()).optional().describe('Output data'),
            error: z.string().optional().describe('Error message'),
            metadata: z.record(z.string(), z.any()).optional().describe('Metadata')
          })
        )
        .describe('Array of events to log'),
      isSingleSession: z
        .boolean()
        .optional()
        .describe('If true, all events share one session'),
      project: z.string().optional().describe('Default project name for all events')
    })
  )
  .output(
    z.object({
      eventIds: z.array(z.string()).describe('IDs of the created events'),
      sessionId: z.string().optional().describe('Session ID if a single session was used'),
      success: z.boolean().describe('Whether the batch was logged successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      serverUrl: ctx.config.serverUrl
    });

    let defaultProject = ctx.input.project || ctx.config.project;

    let events = ctx.input.events.map(e => ({
      project: e.project || defaultProject,
      event_type: e.eventType,
      event_name: e.eventName,
      source: e.source,
      config: e.eventConfig,
      inputs: e.inputs,
      duration: e.duration,
      session_id: e.sessionId,
      parent_id: e.parentId,
      outputs: e.outputs,
      error: e.error,
      metadata: e.metadata
    }));

    let data = await client.createEventBatch({
      events,
      is_single_session: ctx.input.isSingleSession
    });

    return {
      output: {
        eventIds: data.event_ids || [],
        sessionId: data.session_id,
        success: data.success ?? true
      },
      message: `Logged **${data.event_ids?.length ?? 0}** events in batch.`
    };
  })
  .build();

export let queryEvents = SlateTool.create(spec, {
  name: 'Query Events',
  key: 'query_events',
  description: `Search and filter trace events using structured filters. Supports filtering by event type, metadata fields, date ranges, and more. Use for monitoring, debugging, and data exploration.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      project: z
        .string()
        .optional()
        .describe('Project name. Falls back to the configured default project.'),
      filters: z
        .array(
          z.object({
            field: z
              .string()
              .describe('Field to filter on (e.g., "event_type", "metadata.cost")'),
            value: z.any().describe('Value to compare against'),
            operator: z
              .string()
              .describe(
                'Comparison operator (e.g., "is", "is not", "contains", "greater than")'
              ),
            type: z
              .string()
              .describe('Value type: "string", "number", "boolean", or "datetime"')
          })
        )
        .optional()
        .describe('Structured filters to apply'),
      dateRange: z
        .object({
          from: z.string().optional().describe('Start date in ISO 8601 format'),
          to: z.string().optional().describe('End date in ISO 8601 format')
        })
        .optional()
        .describe('Date range to filter events'),
      limit: z
        .number()
        .optional()
        .default(100)
        .describe('Maximum number of events to return (max 7500)'),
      page: z.number().optional().default(1).describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      events: z.array(z.record(z.string(), z.any())).describe('Matching events'),
      totalEvents: z.number().optional().describe('Total count of matching events')
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

    let dateRange: { $gte?: string; $lte?: string } | undefined;
    if (ctx.input.dateRange) {
      dateRange = {};
      if (ctx.input.dateRange.from) dateRange.$gte = ctx.input.dateRange.from;
      if (ctx.input.dateRange.to) dateRange.$lte = ctx.input.dateRange.to;
    }

    let data = await client.exportEvents({
      project,
      filters: ctx.input.filters || [],
      dateRange,
      limit: ctx.input.limit,
      page: ctx.input.page
    });

    let events = data.events || [];

    return {
      output: {
        events,
        totalEvents: data.totalEvents
      },
      message: `Found **${events.length}** events (total: ${data.totalEvents ?? 'unknown'}).`
    };
  })
  .build();

export let getEvent = SlateTool.create(spec, {
  name: 'Get Event',
  key: 'get_event',
  description: `Retrieve a single event by its ID, including all nested child events.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      eventId: z.string().describe('ID of the event to retrieve')
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('Event ID'),
      eventType: z.string().optional().describe('Type of event'),
      eventName: z.string().optional().describe('Name of the event'),
      project: z.string().optional().describe('Project name'),
      sessionId: z.string().optional().describe('Session ID'),
      inputs: z.record(z.string(), z.any()).optional().describe('Event inputs'),
      outputs: z.record(z.string(), z.any()).optional().describe('Event outputs'),
      error: z.string().optional().describe('Error if failed'),
      duration: z.number().optional().describe('Duration in ms'),
      metadata: z.record(z.string(), z.any()).optional().describe('Event metadata'),
      metrics: z.record(z.string(), z.any()).optional().describe('Event metrics'),
      feedback: z.record(z.string(), z.any()).optional().describe('Event feedback'),
      children: z.array(z.any()).optional().describe('Child events')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      serverUrl: ctx.config.serverUrl
    });

    let data = await client.getEvent(ctx.input.eventId);

    return {
      output: {
        eventId: data?.event_id || ctx.input.eventId,
        eventType: data?.event_type,
        eventName: data?.event_name,
        project: data?.project,
        sessionId: data?.session_id,
        inputs: data?.inputs,
        outputs: data?.outputs,
        error: data?.error,
        duration: data?.duration,
        metadata: data?.metadata,
        metrics: data?.metrics,
        feedback: data?.feedback,
        children: data?.children
      },
      message: `Retrieved event \`${ctx.input.eventId}\`.`
    };
  })
  .build();

export let deleteEvent = SlateTool.create(spec, {
  name: 'Delete Event',
  key: 'delete_event',
  description: `Delete a single event by its ID.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      eventId: z.string().describe('ID of the event to delete')
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

    await client.deleteEvent(ctx.input.eventId);

    return {
      output: { success: true },
      message: `Deleted event \`${ctx.input.eventId}\`.`
    };
  })
  .build();

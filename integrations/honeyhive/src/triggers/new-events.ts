import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newEvents = SlateTrigger.create(spec, {
  name: 'New Events',
  key: 'new_events',
  description:
    'Triggers when new trace events (sessions, model calls, tool calls, or chain steps) are logged in a project. Polls the HoneyHive API for recently created events.'
})
  .input(
    z.object({
      eventId: z.string().describe('ID of the event'),
      eventType: z.string().describe('Type of event (session, model, tool, chain)'),
      eventName: z.string().describe('Name of the event'),
      project: z.string().describe('Project name'),
      sessionId: z.string().optional().describe('Session ID this event belongs to'),
      source: z.string().optional().describe('Source environment'),
      inputs: z.record(z.string(), z.any()).optional().describe('Event inputs'),
      outputs: z.record(z.string(), z.any()).optional().describe('Event outputs'),
      error: z.string().optional().nullable().describe('Error message if failed'),
      duration: z.number().optional().describe('Duration in milliseconds'),
      metadata: z.record(z.string(), z.any()).optional().describe('Event metadata'),
      startTime: z.number().optional().describe('Start time epoch ms')
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('Event ID'),
      eventType: z.string().describe('Event type'),
      eventName: z.string().describe('Event name'),
      project: z.string().describe('Project name'),
      sessionId: z.string().optional().describe('Session ID'),
      source: z.string().optional().describe('Source environment'),
      inputs: z.record(z.string(), z.any()).optional().describe('Event inputs'),
      outputs: z.record(z.string(), z.any()).optional().describe('Event outputs'),
      error: z.string().optional().nullable().describe('Error message'),
      duration: z.number().optional().describe('Duration in ms'),
      metadata: z.record(z.string(), z.any()).optional().describe('Event metadata'),
      startTime: z.number().optional().describe('Start time epoch ms')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        serverUrl: ctx.config.serverUrl
      });

      let project = ctx.config.project;
      if (!project) {
        ctx.warn('No default project configured. Skipping poll.');
        return { inputs: [], updatedState: ctx.state };
      }

      let lastPollTime = ctx.state?.lastPollTime as string | undefined;
      let now = new Date().toISOString();

      let dateRange: { $gte?: string; $lte?: string } | undefined;
      if (lastPollTime) {
        dateRange = { $gte: lastPollTime, $lte: now };
      }

      let data = await client.exportEvents({
        project,
        filters: [],
        dateRange,
        limit: 100,
        page: 1
      });

      let events = data.events || [];
      let lastSeenIds = (ctx.state?.lastSeenIds as string[]) || [];

      let newEvents = events.filter((e: any) => {
        let id = e.event_id || e._id;
        return !lastSeenIds.includes(id);
      });

      let newIds = newEvents.map((e: any) => e.event_id || e._id);
      let updatedSeenIds = [...newIds, ...lastSeenIds].slice(0, 500);

      return {
        inputs: newEvents.map((e: any) => ({
          eventId: e.event_id || e._id,
          eventType: e.event_type || 'unknown',
          eventName: e.event_name || '',
          project: e.project || project,
          sessionId: e.session_id,
          source: e.source,
          inputs: e.inputs,
          outputs: e.outputs,
          error: e.error,
          duration: e.duration,
          metadata: e.metadata,
          startTime: e.start_time
        })),
        updatedState: {
          lastPollTime: now,
          lastSeenIds: updatedSeenIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `event.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          eventId: ctx.input.eventId,
          eventType: ctx.input.eventType,
          eventName: ctx.input.eventName,
          project: ctx.input.project,
          sessionId: ctx.input.sessionId,
          source: ctx.input.source,
          inputs: ctx.input.inputs,
          outputs: ctx.input.outputs,
          error: ctx.input.error,
          duration: ctx.input.duration,
          metadata: ctx.input.metadata,
          startTime: ctx.input.startTime
        }
      };
    }
  })
  .build();

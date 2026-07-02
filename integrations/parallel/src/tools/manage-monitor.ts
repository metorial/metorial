import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageMonitor = SlateTool.create(spec, {
  name: 'Manage Monitor',
  key: 'manage_monitor',
  description: `Retrieve, update, or delete an existing web monitor. Can also list all monitors or fetch events for a specific monitor.
Use the monitor ID from the **Create Monitor** tool.`,
  instructions: [
    'Use action "get" to retrieve monitor details.',
    'Use action "list" to list all monitors (monitorId is not required).',
    'Use action "update" to change frequency or metadata.',
    'Use action "delete" to stop and remove a monitor.',
    'Use action "get_events" to retrieve detected events for a monitor.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['get', 'list', 'update', 'delete', 'get_events'])
        .describe('Action to perform on the monitor'),
      monitorId: z
        .string()
        .optional()
        .describe('Monitor ID (required for get, update, delete, get_events)'),
      frequency: z
        .string()
        .optional()
        .describe('New frequency for update action (e.g. "1h", "1d")'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('New metadata for update action')
    })
  )
  .output(
    z.object({
      monitor: z
        .object({
          monitorId: z.string().describe('Monitor ID'),
          query: z.string().describe('Monitoring query'),
          status: z.string().describe('Status'),
          frequency: z.string().describe('Check frequency'),
          createdAt: z.string().describe('Creation timestamp'),
          lastRunAt: z.string().nullable().describe('Last run timestamp'),
          metadata: z.record(z.string(), z.string()).nullable().describe('Metadata')
        })
        .nullable()
        .describe('Monitor details (null for list/delete/get_events actions)'),
      monitors: z
        .array(
          z.object({
            monitorId: z.string().describe('Monitor ID'),
            query: z.string().describe('Monitoring query'),
            status: z.string().describe('Status'),
            frequency: z.string().describe('Check frequency'),
            createdAt: z.string().describe('Creation timestamp'),
            lastRunAt: z.string().nullable().describe('Last run timestamp')
          })
        )
        .nullable()
        .describe('List of monitors (only for list action)'),
      events: z
        .array(
          z.object({
            type: z.string().describe('Event type'),
            eventGroupId: z.string().describe('Event group ID'),
            output: z.unknown().describe('Event output'),
            eventDate: z.string().describe('Event date'),
            sourceUrls: z.array(z.string()).describe('Source URLs')
          })
        )
        .nullable()
        .describe('Events list (only for get_events action)'),
      deleted: z.boolean().describe('Whether a monitor was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { action, monitorId } = ctx.input;

    if (action === 'list') {
      let monitors = await client.listMonitors();
      return {
        output: {
          monitor: null,
          monitors: monitors.map(m => ({
            monitorId: m.monitorId,
            query: m.query,
            status: m.status,
            frequency: m.frequency,
            createdAt: m.createdAt,
            lastRunAt: m.lastRunAt
          })),
          events: null,
          deleted: false
        },
        message: `Found **${monitors.length}** monitor${monitors.length !== 1 ? 's' : ''}.`
      };
    }

    if (!monitorId) {
      throw new Error('monitorId is required for this action');
    }

    if (action === 'get') {
      let monitor = await client.getMonitor(monitorId);
      return {
        output: {
          monitor: {
            monitorId: monitor.monitorId,
            query: monitor.query,
            status: monitor.status,
            frequency: monitor.frequency,
            createdAt: monitor.createdAt,
            lastRunAt: monitor.lastRunAt,
            metadata: monitor.metadata
          },
          monitors: null,
          events: null,
          deleted: false
        },
        message: `Monitor **${monitor.monitorId}** — status: **${monitor.status}**, frequency: **${monitor.frequency}**.`
      };
    }

    if (action === 'update') {
      let monitor = await client.updateMonitor(monitorId, {
        frequency: ctx.input.frequency,
        metadata: ctx.input.metadata
      });
      return {
        output: {
          monitor: {
            monitorId: monitor.monitorId,
            query: monitor.query,
            status: monitor.status,
            frequency: monitor.frequency,
            createdAt: monitor.createdAt,
            lastRunAt: monitor.lastRunAt,
            metadata: monitor.metadata
          },
          monitors: null,
          events: null,
          deleted: false
        },
        message: `Monitor **${monitor.monitorId}** updated. Frequency: **${monitor.frequency}**.`
      };
    }

    if (action === 'delete') {
      await client.deleteMonitor(monitorId);
      return {
        output: {
          monitor: null,
          monitors: null,
          events: null,
          deleted: true
        },
        message: `Monitor **${monitorId}** deleted.`
      };
    }

    if (action === 'get_events') {
      let events = await client.getMonitorEvents(monitorId);
      return {
        output: {
          monitor: null,
          monitors: null,
          events,
          deleted: false
        },
        message: `Found **${events.length}** event${events.length !== 1 ? 's' : ''} for monitor **${monitorId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();

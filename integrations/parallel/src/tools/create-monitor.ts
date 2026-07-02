import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createMonitor = SlateTool.create(spec, {
  name: 'Create Monitor',
  key: 'create_monitor',
  description: `Create a web monitor that continuously tracks the web for changes relevant to a query on a configurable schedule.
Monitors detect new information as it's published and can deliver results via webhooks.`,
  instructions: [
    'Frequency format is a number followed by h (hours), d (days), or w (weeks) — e.g. "1h", "1d", "1w".',
    'Use outputSchema to get structured event data in a consistent format.',
    'Monitors track new updates as they happen, not historical data.'
  ],
  constraints: [
    'Frequency must be between 1 hour and 30 days.',
    'Monitor API is in public alpha — endpoints may change.'
  ]
})
  .input(
    z.object({
      query: z.string().describe('Natural language monitoring query describing what to track'),
      frequency: z
        .string()
        .describe(
          'How often to check (e.g. "1h", "6h", "1d", "1w"). Range: 1 hour to 30 days.'
        ),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Key-value metadata for routing or organization'),
      outputSchema: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('JSON schema for structured event output')
    })
  )
  .output(
    z.object({
      monitorId: z.string().describe('Unique monitor ID'),
      query: z.string().describe('Monitoring query'),
      status: z.string().describe('Monitor status (active or canceled)'),
      frequency: z.string().describe('Check frequency'),
      createdAt: z.string().describe('Creation timestamp'),
      lastRunAt: z.string().nullable().describe('Last execution timestamp or null'),
      metadata: z.record(z.string(), z.string()).nullable().describe('Attached metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let monitor = await client.createMonitor({
      query: ctx.input.query,
      frequency: ctx.input.frequency,
      metadata: ctx.input.metadata,
      outputSchema: ctx.input.outputSchema
    });

    return {
      output: {
        monitorId: monitor.monitorId,
        query: monitor.query,
        status: monitor.status,
        frequency: monitor.frequency,
        createdAt: monitor.createdAt,
        lastRunAt: monitor.lastRunAt,
        metadata: monitor.metadata
      },
      message: `Monitor created with ID **${monitor.monitorId}**, checking every **${monitor.frequency}**. Status: **${monitor.status}**.`
    };
  })
  .build();

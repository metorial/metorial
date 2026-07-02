import { SlateTool } from 'slates';
import { z } from 'zod';
import { MezmoClient } from '../lib/client';
import { spec } from '../spec';

export let ingestLogs = SlateTool.create(spec, {
  name: 'Ingest Logs',
  key: 'ingest_logs',
  description: `Send log lines to Mezmo programmatically. Supports sending multiple log lines in a single request with custom metadata, application names, log levels, and tags.
Requires an ingestion key to be configured in authentication.`,
  instructions: [
    'The hostname query parameter is required and identifies the source of the logs.',
    'Each log line must include the "line" field with the log message text.',
    'Custom metadata can be attached via the "meta" field on each line. Use consistent value types for metadata fields.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      hostname: z.string().describe('Source hostname for the log lines'),
      lines: z
        .array(
          z.object({
            line: z.string().describe('The log message content'),
            timestamp: z.number().optional().describe('Unix timestamp in milliseconds'),
            app: z.string().optional().describe('Application name'),
            level: z
              .string()
              .optional()
              .describe('Log level (DEBUG, INFO, WARN, ERROR, FATAL)'),
            env: z
              .string()
              .optional()
              .describe('Environment name (e.g., production, staging)'),
            meta: z
              .record(z.string(), z.unknown())
              .optional()
              .describe('Custom metadata object'),
            tags: z.string().optional().describe('Comma-separated tags for this line')
          })
        )
        .min(1)
        .describe('Array of log lines to ingest'),
      tags: z.string().optional().describe('Comma-separated tags applied to all lines')
    })
  )
  .output(
    z.object({
      ingested: z.boolean().describe('Whether the logs were successfully ingested')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MezmoClient({
      token: ctx.auth.token,
      ingestionKey: ctx.auth.ingestionKey
    });

    await client.ingestLogs({
      hostname: ctx.input.hostname,
      lines: ctx.input.lines,
      tags: ctx.input.tags
    });

    return {
      output: { ingested: true },
      message: `Successfully ingested **${ctx.input.lines.length}** log line(s) from host **${ctx.input.hostname}**.`
    };
  })
  .build();

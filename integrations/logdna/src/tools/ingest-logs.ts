import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let logLineSchema = z.object({
  line: z.string().describe('The log message content'),
  timestamp: z
    .number()
    .optional()
    .describe('Unix timestamp in milliseconds. Defaults to current time if omitted'),
  app: z.string().optional().describe('Application name associated with this log line'),
  level: z.string().optional().describe('Log level (e.g., INFO, WARN, ERROR, DEBUG)'),
  env: z.string().optional().describe('Environment name (e.g., production, staging)'),
  meta: z
    .record(z.string(), z.any())
    .optional()
    .describe('Custom metadata key-value pairs associated with this log line'),
  file: z.string().optional().describe('File name or path associated with the log line')
});

export let ingestLogs = SlateTool.create(spec, {
  name: 'Ingest Logs',
  key: 'ingest_logs',
  description: `Send log lines to LogDNA for ingestion. Supports sending one or more log lines in a single request, each with optional metadata, app name, log level, and environment. Requires a hostname to identify the source. The ingestion key must be configured in authentication settings.`,
  instructions: [
    'Use consistent value types in the meta field across log lines to ensure proper metadata parsing.',
    'Request body is limited to 10 MB per request.'
  ],
  constraints: [
    'Maximum 10 MB per request.',
    'Requires an ingestion key (configured as ingestionToken in auth).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      hostname: z.string().describe('Hostname of the source sending logs'),
      lines: z.array(logLineSchema).min(1).describe('Array of log lines to ingest'),
      tags: z.string().optional().describe('Comma-separated tags to apply to all log lines'),
      ip: z.string().optional().describe('IP address of the source'),
      mac: z.string().optional().describe('MAC address of the source')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Status of the ingestion request')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      serviceKey: ctx.auth.token,
      ingestionKey: ctx.auth.ingestionToken
    });

    let result = await client.ingestLogs(
      ctx.input.lines.map(l => ({
        line: l.line,
        timestamp: l.timestamp,
        app: l.app,
        level: l.level,
        env: l.env,
        meta: l.meta,
        file: l.file
      })),
      {
        hostname: ctx.input.hostname,
        tags: ctx.input.tags,
        ip: ctx.input.ip,
        mac: ctx.input.mac
      }
    );

    return {
      output: {
        status: result?.status || 'ok'
      },
      message: `Successfully ingested **${ctx.input.lines.length}** log line(s) from hostname **${ctx.input.hostname}**.`
    };
  })
  .build();

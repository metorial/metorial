import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let sslInfoSchema = z
  .object({
    testedAt: z.string().optional().nullable(),
    expiresAt: z.string().optional().nullable(),
    valid: z.boolean().optional().nullable(),
    error: z.string().optional().nullable()
  })
  .optional()
  .nullable();

let checkInfoSchema = z.object({
  token: z.string(),
  url: z.string(),
  alias: z.string().optional().nullable(),
  down: z.boolean().optional().nullable(),
  error: z.string().optional().nullable(),
  period: z.number().optional().nullable(),
  enabled: z.boolean().optional().nullable(),
  published: z.boolean().optional().nullable(),
  lastStatus: z.number().optional().nullable(),
  uptime: z.number().optional().nullable(),
  ssl: sslInfoSchema
});

let downtimeInfoSchema = z
  .object({
    downtimeId: z.string().optional().nullable(),
    error: z.string().optional().nullable(),
    startedAt: z.string().optional().nullable(),
    endedAt: z.string().optional().nullable(),
    duration: z.number().optional().nullable(),
    partial: z.boolean().optional().nullable()
  })
  .optional()
  .nullable();

export let monitoringEvents = SlateTrigger.create(spec, {
  name: 'Monitoring Events',
  key: 'monitoring_events',
  description:
    'Fires when a monitoring check goes down or up, SSL certificate status changes, or performance drops are detected. Receives real-time webhook events from Updown.io.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('The event type (e.g. check.down, check.up, check.ssl_invalid)'),
      eventTime: z.string().describe('ISO 8601 timestamp of the event'),
      description: z.string().describe('Human-readable description of the event'),
      check: z.any().describe('Check object from the webhook payload'),
      downtime: z.any().optional().nullable().describe('Downtime object if applicable'),
      ssl: z.any().optional().nullable().describe('SSL certificate details if applicable'),
      apdexDropped: z
        .number()
        .optional()
        .nullable()
        .describe('Percentage drop in APDEX score'),
      lastMetrics: z
        .any()
        .optional()
        .nullable()
        .describe('Recent APDEX metrics for performance drop events')
    })
  )
  .output(
    z.object({
      eventType: z
        .string()
        .describe(
          'Event type: check.down, check.up, check.ssl_invalid, check.ssl_valid, check.ssl_expiration, check.ssl_renewed, or check.performance_drop'
        ),
      eventTime: z.string().describe('ISO 8601 timestamp of the event'),
      description: z.string().describe('Human-readable description of the event'),
      check: checkInfoSchema.describe('Affected monitoring check'),
      downtime: downtimeInfoSchema.describe(
        'Downtime details (for check.down and check.up events)'
      ),
      ssl: sslInfoSchema.describe('SSL certificate info (for SSL-related events)'),
      apdexDropped: z
        .number()
        .optional()
        .nullable()
        .describe('APDEX drop percentage (for performance_drop events)'),
      daysBeforeExpiration: z
        .number()
        .optional()
        .nullable()
        .describe('Days until SSL expiration (for ssl_expiration events)')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let recipient = await client.createRecipient({
        type: 'webhook',
        value: ctx.input.webhookBaseUrl,
        name: 'Slates Webhook',
        selected: true
      });
      return {
        registrationDetails: {
          recipientId: recipient.recipientId
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as { recipientId: string };
      await client.deleteRecipient(details.recipientId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any[];

      // Updown.io always sends events as a JSON array
      let events = Array.isArray(data) ? data : [data];

      return {
        inputs: events.map((event: any) => {
          let rawCheck = event.check ?? {};
          let rawDowntime = event.downtime ?? null;
          let rawSsl = event.ssl ?? null;

          return {
            eventType: event.event ?? 'unknown',
            eventTime: event.time ?? new Date().toISOString(),
            description: event.description ?? '',
            check: rawCheck,
            downtime: rawDowntime,
            ssl: rawSsl,
            apdexDropped: event.apdex_dropped ?? null,
            lastMetrics: event.last_metrics ?? null
          };
        })
      };
    },

    handleEvent: async ctx => {
      let input = ctx.input;
      let rawCheck = input.check ?? {};
      let rawDowntime = input.downtime;
      let rawSsl = input.ssl;

      let check = {
        token: rawCheck.token ?? '',
        url: rawCheck.url ?? '',
        alias: rawCheck.alias ?? null,
        down: rawCheck.down ?? null,
        error: rawCheck.error ?? null,
        period: rawCheck.period ?? null,
        enabled: rawCheck.enabled ?? null,
        published: rawCheck.published ?? null,
        lastStatus: rawCheck.last_status ?? null,
        uptime: rawCheck.uptime ?? null,
        ssl: rawCheck.ssl
          ? {
              testedAt: rawCheck.ssl.tested_at ?? null,
              expiresAt: rawCheck.ssl.expires_at ?? null,
              valid: rawCheck.ssl.valid ?? null,
              error: rawCheck.ssl.error ?? null
            }
          : null
      };

      let downtime = rawDowntime
        ? {
            downtimeId: rawDowntime.id ? String(rawDowntime.id) : null,
            error: rawDowntime.error ?? null,
            startedAt: rawDowntime.started_at ?? null,
            endedAt: rawDowntime.ended_at ?? null,
            duration: rawDowntime.duration ?? null,
            partial: rawDowntime.partial ?? null
          }
        : null;

      let ssl = rawSsl
        ? {
            testedAt: rawSsl.tested_at ?? null,
            expiresAt: rawSsl.expires_at ?? null,
            valid: rawSsl.valid ?? null,
            error: rawSsl.error ?? null
          }
        : null;

      let daysBeforeExpiration: number | null = null;
      if (input.eventType === 'check.ssl_expiration' && rawSsl) {
        daysBeforeExpiration = rawSsl.days_before_expiration ?? null;
      }

      // Build a unique dedup ID from event type, check token, and timestamp
      let dedupId = `${input.eventType}-${check.token}-${input.eventTime}`;

      return {
        type: input.eventType,
        id: dedupId,
        output: {
          eventType: input.eventType,
          eventTime: input.eventTime,
          description: input.description,
          check,
          downtime,
          ssl,
          apdexDropped: input.apdexDropped ?? null,
          daysBeforeExpiration
        }
      };
    }
  })
  .build();

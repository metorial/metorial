import { SlateTool } from 'slates';
import { z } from 'zod';
import { PagerDutyClient } from '../lib/client';
import { pagerDutyServiceError } from '../lib/errors';
import { spec } from '../spec';

export let sendEvent = SlateTool.create(spec, {
  name: 'Send Event',
  key: 'send_event',
  description: `Send an alert event or change event to PagerDuty via the Events API v2. Alert events can trigger, acknowledge, or resolve incidents. Change events provide deployment/change context for responders.`,
  instructions: [
    'A **routingKey** (32-character integration key) is required. This is obtained from a service integration.',
    'For alert events: set **eventType** to "alert" and **eventAction** to "trigger", "acknowledge", or "resolve".',
    'For change events: set **eventType** to "change" — only a summary is needed.',
    'When acknowledging or resolving, a **dedupKey** is required to identify the alert.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      eventType: z.enum(['alert', 'change']).describe('Type of event to send'),
      routingKey: z
        .string()
        .describe('32-character integration routing key from a PagerDuty service'),
      eventAction: z
        .enum(['trigger', 'acknowledge', 'resolve'])
        .optional()
        .describe('Alert event action (required for alert events)'),
      summary: z
        .string()
        .optional()
        .describe('Event summary (required for trigger and change events)'),
      severity: z
        .enum(['critical', 'error', 'warning', 'info'])
        .optional()
        .describe('Alert severity (for trigger events, defaults to "critical")'),
      source: z.string().optional().describe('Source of the event'),
      component: z.string().optional().describe('Component affected'),
      group: z.string().optional().describe('Logical grouping'),
      eventClass: z.string().optional().describe('Event class/type'),
      dedupKey: z
        .string()
        .optional()
        .describe('Deduplication key (required for acknowledge/resolve)'),
      customDetails: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional key-value pairs to include'),
      timestamp: z
        .string()
        .optional()
        .describe('Event timestamp for change events (ISO 8601)'),
      links: z
        .array(
          z.object({
            href: z.string().describe('Link URL'),
            text: z.string().optional().describe('Link display text')
          })
        )
        .optional()
        .describe('Related links (for change events)')
    })
  )
  .output(
    z.object({
      status: z.string().describe('API response status'),
      message: z.string().describe('API response message'),
      dedupKey: z.string().optional().describe('Deduplication key for the event')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PagerDutyClient({
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType,
      region: ctx.config.region
    });

    if (ctx.input.eventType === 'change') {
      if (!ctx.input.summary)
        throw pagerDutyServiceError('summary is required for change events');

      let result = await client.sendChangeEvent({
        routingKey: ctx.input.routingKey,
        summary: ctx.input.summary,
        source: ctx.input.source,
        timestamp: ctx.input.timestamp,
        customDetails: ctx.input.customDetails,
        links: ctx.input.links
      });

      return {
        output: {
          status: result.status,
          message: result.message
        },
        message: `Sent change event: "${ctx.input.summary}".`
      };
    }

    // Alert event
    if (!ctx.input.eventAction)
      throw pagerDutyServiceError('eventAction is required for alert events');
    if (ctx.input.eventAction === 'trigger' && !ctx.input.summary)
      throw pagerDutyServiceError('summary is required for trigger alert events');
    if (ctx.input.eventAction !== 'trigger' && !ctx.input.dedupKey)
      throw pagerDutyServiceError(
        'dedupKey is required for acknowledge and resolve alert events'
      );

    let result = await client.sendEvent({
      routingKey: ctx.input.routingKey,
      eventAction: ctx.input.eventAction,
      dedupKey: ctx.input.dedupKey,
      severity: ctx.input.severity,
      summary: ctx.input.summary,
      source: ctx.input.source,
      component: ctx.input.component,
      group: ctx.input.group,
      eventClass: ctx.input.eventClass,
      customDetails: ctx.input.customDetails
    });

    return {
      output: {
        status: result.status,
        message: result.message,
        dedupKey: result.dedup_key
      },
      message: `Sent alert event (${ctx.input.eventAction}). Dedup key: \`${result.dedup_key}\`.`
    };
  })
  .build();

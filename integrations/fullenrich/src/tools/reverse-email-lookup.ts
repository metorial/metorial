import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let reverseEmailLookup = SlateTool.create(spec, {
  name: 'Reverse Email Lookup',
  key: 'reverse_email_lookup',
  description: `Start an asynchronous reverse email lookup to identify the person and company behind one or more email addresses. Works with both personal and professional emails.

Returns an enrichment ID for tracking. Use **Get Reverse Email Result** to retrieve the full person profile (name, job title, location, work history) and company details (name, industry, headcount).

Costs 1 credit per successful match.`,
  instructions: [
    'Provide at least one email address to look up.',
    'Use custom fields to correlate results back to your records.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z
        .string()
        .describe('A readable name for this lookup batch (visible in dashboard)'),
      emails: z
        .array(
          z.object({
            email: z.string().describe('Email address to look up'),
            custom: z
              .record(z.string(), z.string())
              .optional()
              .describe('Custom key-value pairs for tracking')
          })
        )
        .min(1)
        .describe('Email addresses to look up'),
      webhookUrl: z.string().optional().describe('URL to receive POST when lookup completes'),
      contactFinishedWebhookUrl: z
        .string()
        .optional()
        .describe('URL to receive POST for each individual email as it completes')
    })
  )
  .output(
    z.object({
      enrichmentId: z.string().describe('Unique ID to track this reverse lookup batch')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let webhookEvents: { contact_finished?: string } | undefined;
    if (ctx.input.contactFinishedWebhookUrl) {
      webhookEvents = { contact_finished: ctx.input.contactFinishedWebhookUrl };
    }

    let result = await client.startReverseEmailLookup({
      name: ctx.input.name,
      webhook_url: ctx.input.webhookUrl,
      webhook_events: webhookEvents,
      data: ctx.input.emails.map(e => ({
        email: e.email,
        custom: e.custom as Record<string, string> | undefined
      }))
    });

    return {
      output: {
        enrichmentId: result.enrichmentId
      },
      message: `Reverse email lookup **"${ctx.input.name}"** started with ${ctx.input.emails.length} email(s). Enrichment ID: \`${result.enrichmentId}\``
    };
  })
  .build();

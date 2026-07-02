import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let trackEvent = SlateTool.create(spec, {
  name: 'Track Event',
  key: 'track_event',
  description: `Tracks a custom behavioral event in Userlist. Events represent actions performed by users or companies within your product. Events can be associated with a user, a company, or both.
Event names are normalized to \`snake_case\` internally.`,
  instructions: [
    'Provide at least one of `userIdentifier` or `companyIdentifier` to associate the event.',
    'If `occurredAt` is omitted, the current time is used.'
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
        .describe(
          'Name of the event (e.g. "project_created", "subscription_upgraded"). Normalized to snake_case.'
        ),
      userIdentifier: z
        .string()
        .optional()
        .describe('Identifier of the user who performed the event.'),
      companyIdentifier: z
        .string()
        .optional()
        .describe('Identifier of the company context for the event.'),
      occurredAt: z
        .string()
        .optional()
        .describe(
          'Timestamp when the event occurred, in RFC3339/ISO8601 format. Defaults to now.'
        ),
      properties: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom properties describing the event (e.g. plan name, amount).')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the request was accepted.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let payload: Record<string, unknown> = {
      name: ctx.input.name
    };
    if (ctx.input.userIdentifier) payload.user = ctx.input.userIdentifier;
    if (ctx.input.companyIdentifier) payload.company = ctx.input.companyIdentifier;
    if (ctx.input.occurredAt) payload.occurred_at = ctx.input.occurredAt;
    if (ctx.input.properties) payload.properties = ctx.input.properties;

    await client.trackEvent(payload as any);

    return {
      output: { success: true },
      message: `Event **${ctx.input.name}** has been tracked successfully.`
    };
  })
  .build();

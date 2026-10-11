import { SlateTool } from 'slates';
import { z } from 'zod';
import { OpsGenieClient } from '../lib/client';
import { spec } from '../spec';

let participantSchema = z.object({
  name: z.string().optional().describe('Participant name or username'),
  type: z.string().optional().describe('Participant type (user, team, escalation, schedule)'),
  id: z.string().optional().describe('Participant ID'),
  forwardedFromName: z
    .string()
    .optional()
    .describe('Username of the user whose notifications are forwarded to this participant'),
  members: z
    .array(
      z.object({
        name: z.string().optional().describe('Member name or username'),
        type: z.string().optional().describe('Member type'),
        id: z.string().optional().describe('Member ID')
      })
    )
    .optional()
    .describe('Nested on-call participants for team or escalation participants')
});

let isRecord = (value: unknown): value is Record<string, any> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let collectNestedMembers = (participant: Record<string, any>) => {
  let members: Array<{ name?: string; type?: string; id?: string }> = [];
  let visit = (items: unknown) => {
    if (!Array.isArray(items)) return;
    for (let item of items) {
      if (!isRecord(item)) continue;
      members.push({ name: item.name, type: item.type, id: item.id });
      visit(item.onCallParticipants);
    }
  };
  visit(participant.onCallParticipants);
  return members.length > 0 ? members : undefined;
};

let mapParticipants = (value: unknown) =>
  Array.isArray(value)
    ? value.filter(isRecord).map(p => ({
        name: p.name,
        type: p.type,
        id: p.id,
        forwardedFromName: isRecord(p.forwardedFrom) ? p.forwardedFrom.name : undefined,
        members: collectNestedMembers(p)
      }))
    : [];

let mapRecipients = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : undefined;

export let getOnCall = SlateTool.create(spec, {
  name: 'Get On-Call',
  key: 'get_on_call',
  description: `Query who is currently on-call or who is next on-call for a specific schedule. Returns the on-call participants. Use "current" to see who is on call now, or "next" to see who will be on call next.`,
  instructions: [
    'Set flat to true to get just the usernames of on-call users in onCallRecipients.',
    'For "next", exactOnCallParticipants / exactOnCallRecipients reflect overrides (final schedule view, calculated up to 2 weeks ahead).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      scheduleIdentifier: z
        .string()
        .describe('Schedule ID or name. Use list_schedules to find schedules.'),
      scheduleIdentifierType: z
        .enum(['id', 'name'])
        .optional()
        .describe('Type of schedule identifier. Defaults to "id"'),
      type: z
        .enum(['current', 'next'])
        .optional()
        .describe('Whether to get current or next on-call. Defaults to "current"'),
      flat: z
        .boolean()
        .optional()
        .describe('Return a simplified flat response with just usernames'),
      date: z
        .string()
        .optional()
        .describe(
          'Point in time to query, in ISO 8601 format (e.g., 2024-01-15T08:00:00+02:00). Defaults to now'
        )
    })
  )
  .output(
    z.object({
      parent: z
        .object({
          scheduleId: z.string().optional().describe('Schedule ID'),
          name: z.string().optional().describe('Schedule name'),
          enabled: z.boolean().optional().describe('Whether the schedule is enabled')
        })
        .optional()
        .describe('Parent schedule info'),
      onCallParticipants: z
        .array(participantSchema)
        .describe('On-call participants (current or next, depending on type)'),
      onCallRecipients: z
        .array(z.string())
        .optional()
        .describe('On-call usernames (flat mode)'),
      exactOnCallParticipants: z
        .array(participantSchema)
        .optional()
        .describe('Next on-call participants after applying overrides (type "next" only)'),
      exactOnCallRecipients: z
        .array(z.string())
        .optional()
        .describe(
          'Next on-call usernames after applying overrides (type "next" with flat mode only)'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new OpsGenieClient({
      token: ctx.auth.token,
      instance: ctx.config.instance
    });

    let params = {
      scheduleIdentifierType: ctx.input.scheduleIdentifierType,
      flat: ctx.input.flat,
      date: ctx.input.date
    };

    let queryType = ctx.input.type ?? 'current';
    let data: any;

    let onCallParticipants: ReturnType<typeof mapParticipants>;
    let onCallRecipients: string[] | undefined;
    let exactOnCallParticipants: ReturnType<typeof mapParticipants> | undefined;
    let exactOnCallRecipients: string[] | undefined;

    if (queryType === 'next') {
      data = (await client.getNextOnCalls(ctx.input.scheduleIdentifier, params)) ?? {};
      // Opsgenie returns participant objects in `nextOnCallRecipients` / `exactNextOnCallRecipients`
      // when flat=false, and usernames in `nextOnCallParticipants` / `exactNextOnCallParticipants`
      // when flat=true. Map defensively by element shape.
      let next = [data.nextOnCallRecipients, data.nextOnCallParticipants];
      let exact = [data.exactNextOnCallRecipients, data.exactNextOnCallParticipants];

      onCallParticipants = next.flatMap(mapParticipants);
      onCallRecipients = next.map(mapRecipients).find(list => list && list.length > 0);
      exactOnCallParticipants = exact.flatMap(mapParticipants);
      exactOnCallRecipients = exact.map(mapRecipients).find(list => list && list.length > 0);
      if (ctx.input.flat) {
        onCallRecipients ??= [];
        exactOnCallRecipients ??= [];
      }
    } else {
      data = (await client.getOnCalls(ctx.input.scheduleIdentifier, params)) ?? {};
      onCallParticipants = mapParticipants(data.onCallParticipants);
      onCallRecipients = mapRecipients(data.onCallRecipients);
      if (ctx.input.flat) onCallRecipients ??= [];
    }

    let parent = data._parent
      ? {
          scheduleId: data._parent.id,
          name: data._parent.name,
          enabled: data._parent.enabled
        }
      : undefined;

    let participantNames = onCallRecipients?.length
      ? onCallRecipients.join(', ')
      : onCallParticipants
          .map(p => p.name)
          .filter(Boolean)
          .join(', ') || 'none';

    return {
      output: {
        parent,
        onCallParticipants,
        onCallRecipients,
        exactOnCallParticipants,
        exactOnCallRecipients
      },
      message: `${queryType === 'next' ? 'Next' : 'Current'} on-call for schedule \`${ctx.input.scheduleIdentifier}\`: ${participantNames}`
    };
  })
  .build();

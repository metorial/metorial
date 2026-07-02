import { SlateTool } from 'slates';
import { z } from 'zod';
import { OpsGenieClient } from '../lib/client';
import { spec } from '../spec';

export let getOnCall = SlateTool.create(spec, {
  name: 'Get On-Call',
  key: 'get_on_call',
  description: `Query who is currently on-call or who is next on-call for a specific schedule. Returns the on-call participants. Use "current" to see who is on call now, or "next" to see who will be on call next.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      scheduleIdentifier: z.string().describe('Schedule ID or name'),
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
        .describe('Return a simplified flat response with just user info'),
      date: z
        .string()
        .optional()
        .describe('Date to query on-call for in ISO 8601 format. Defaults to now')
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
        .array(
          z.object({
            name: z.string().optional().describe('Participant name or username'),
            type: z.string().optional().describe('Participant type'),
            id: z.string().optional().describe('Participant ID')
          })
        )
        .describe('Currently on-call participants'),
      onCallRecipients: z
        .array(z.string())
        .optional()
        .describe('On-call recipients (flat mode)')
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

    if (queryType === 'next') {
      data = await client.getNextOnCalls(ctx.input.scheduleIdentifier, params);
    } else {
      data = await client.getOnCalls(ctx.input.scheduleIdentifier, params);
    }

    let onCallParticipants = (data.onCallParticipants ?? []).map((p: any) => ({
      name: p.name,
      type: p.type,
      id: p.id
    }));

    let onCallRecipients = data.onCallRecipients;

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
          .map((p: any) => p.name)
          .filter(Boolean)
          .join(', ') || 'none';

    return {
      output: {
        parent,
        onCallParticipants,
        onCallRecipients
      },
      message: `${queryType === 'next' ? 'Next' : 'Current'} on-call for schedule \`${ctx.input.scheduleIdentifier}\`: ${participantNames}`
    };
  })
  .build();

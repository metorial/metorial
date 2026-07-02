import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { OneLoginClient } from '../lib/client';
import { spec } from '../spec';

let eventInputSchema = z.object({
  eventId: z.number().describe('Event ID'),
  eventTypeId: z.number().describe('Event type ID'),
  eventTypeName: z.string().nullable().optional().describe('Event type name'),
  createdAt: z.string().nullable().optional().describe('ISO8601 timestamp'),
  userId: z.number().nullable().optional().describe('Target user ID'),
  userName: z.string().nullable().optional().describe('Target user name'),
  actorUserId: z.number().nullable().optional().describe('Actor user ID'),
  actorUserName: z.string().nullable().optional().describe('Actor user name'),
  appId: z.number().nullable().optional().describe('Related app ID'),
  appName: z.string().nullable().optional().describe('Related app name'),
  ipaddr: z.string().nullable().optional().describe('IP address'),
  roleId: z.number().nullable().optional().describe('Related role ID'),
  roleName: z.string().nullable().optional().describe('Related role name'),
  groupId: z.number().nullable().optional().describe('Related group ID'),
  groupName: z.string().nullable().optional().describe('Related group name'),
  customMessage: z.string().nullable().optional().describe('Custom event message'),
  notes: z.string().nullable().optional().describe('Event notes'),
  errorDescription: z.string().nullable().optional().describe('Error description'),
  riskScore: z.number().nullable().optional().describe('Risk score'),
  accountId: z.number().nullable().optional().describe('Account ID')
});

let eventTypeMap: Record<number, string> = {
  1: 'app.added_to_role',
  2: 'app.removed_from_role',
  3: 'app.assigned_to_user',
  4: 'app.removed_from_user',
  5: 'user.logged_in',
  6: 'user.login_failed',
  7: 'user.logged_out',
  8: 'user.app_login',
  13: 'user.created',
  14: 'user.updated',
  15: 'user.deactivated',
  16: 'user.activated',
  17: 'user.deleted',
  19: 'user.locked',
  20: 'user.unlocked',
  21: 'user.suspended',
  22: 'user.password_changed',
  24: 'user.invitation_sent',
  33: 'user.imported',
  51: 'provisioning.created',
  52: 'provisioning.updated',
  53: 'provisioning.deleted',
  54: 'provisioning.deactivated',
  55: 'provisioning.reactivated'
};

let resolveEventType = (eventTypeId: number): string => {
  return eventTypeMap[eventTypeId] || `event.type_${eventTypeId}`;
};

export let accountEvents = SlateTrigger.create(spec, {
  name: 'Account Events',
  key: 'account_events',
  description:
    '[Polling fallback] Polls for new events on your OneLogin account including authentication, user lifecycle, app access, MFA, admin actions, and provisioning events.'
})
  .input(eventInputSchema)
  .output(
    z.object({
      eventId: z.number().describe('Event ID'),
      eventTypeId: z.number().describe('Event type ID'),
      eventTypeName: z.string().nullable().optional().describe('Event type name'),
      createdAt: z.string().nullable().optional().describe('ISO8601 timestamp'),
      userId: z.number().nullable().optional().describe('Target user ID'),
      userName: z.string().nullable().optional().describe('Target user name'),
      actorUserId: z.number().nullable().optional().describe('Actor user ID'),
      actorUserName: z.string().nullable().optional().describe('Actor user name'),
      appId: z.number().nullable().optional().describe('Related app ID'),
      appName: z.string().nullable().optional().describe('Related app name'),
      ipaddr: z.string().nullable().optional().describe('IP address'),
      roleId: z.number().nullable().optional().describe('Related role ID'),
      roleName: z.string().nullable().optional().describe('Related role name'),
      groupId: z.number().nullable().optional().describe('Related group ID'),
      groupName: z.string().nullable().optional().describe('Related group name'),
      customMessage: z.string().nullable().optional().describe('Custom event message'),
      notes: z.string().nullable().optional().describe('Event notes'),
      errorDescription: z.string().nullable().optional().describe('Error description'),
      riskScore: z.number().nullable().optional().describe('Risk score'),
      accountId: z.number().nullable().optional().describe('Account ID')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new OneLoginClient({
        token: ctx.auth.token,
        subdomain: ctx.config.subdomain
      });

      let params: Record<string, string | number | undefined> = {};

      let lastEventId = ctx.state?.lastEventId as number | undefined;
      let lastPolledAt = ctx.state?.lastPolledAt as string | undefined;

      if (lastPolledAt) {
        params.since = lastPolledAt;
      }

      let response = await client.listEvents(params);
      let events = response.data || [];

      // Filter out events we've already seen
      if (lastEventId) {
        events = events.filter((e: any) => e.id > lastEventId);
      }

      let newLastEventId = lastEventId || 0;
      let newLastPolledAt = lastPolledAt || new Date().toISOString();

      if (events.length > 0) {
        for (let e of events) {
          if (e.id > newLastEventId) {
            newLastEventId = e.id;
          }
        }
        newLastPolledAt = new Date().toISOString();
      }

      return {
        inputs: events.map((e: any) => ({
          eventId: e.id,
          eventTypeId: e.event_type_id,
          eventTypeName: resolveEventType(e.event_type_id),
          createdAt: e.created_at,
          userId: e.user_id,
          userName: e.user_name,
          actorUserId: e.actor_user_id,
          actorUserName: e.actor_user_name,
          appId: e.app_id,
          appName: e.app_name,
          ipaddr: e.ipaddr,
          roleId: e.role_id,
          roleName: e.role_name,
          groupId: e.group_id,
          groupName: e.group_name,
          customMessage: e.custom_message,
          notes: e.notes,
          errorDescription: e.error_description,
          riskScore: e.risk_score,
          accountId: e.account_id
        })),
        updatedState: {
          lastEventId: newLastEventId,
          lastPolledAt: newLastPolledAt
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventTypeName || resolveEventType(ctx.input.eventTypeId),
        id: String(ctx.input.eventId),
        output: {
          eventId: ctx.input.eventId,
          eventTypeId: ctx.input.eventTypeId,
          eventTypeName: ctx.input.eventTypeName,
          createdAt: ctx.input.createdAt,
          userId: ctx.input.userId,
          userName: ctx.input.userName,
          actorUserId: ctx.input.actorUserId,
          actorUserName: ctx.input.actorUserName,
          appId: ctx.input.appId,
          appName: ctx.input.appName,
          ipaddr: ctx.input.ipaddr,
          roleId: ctx.input.roleId,
          roleName: ctx.input.roleName,
          groupId: ctx.input.groupId,
          groupName: ctx.input.groupName,
          customMessage: ctx.input.customMessage,
          notes: ctx.input.notes,
          errorDescription: ctx.input.errorDescription,
          riskScore: ctx.input.riskScore,
          accountId: ctx.input.accountId
        }
      };
    }
  });

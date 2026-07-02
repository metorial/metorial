import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

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

let webhookEventSchema = z.object({
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

export let eventWebhook = SlateTrigger.create(spec, {
  name: 'Event Webhook',
  key: 'event_webhook',
  description:
    'Receives real-time events from the OneLogin Event Broadcaster webhook. Configure the webhook URL in the OneLogin Admin portal under Developers > Webhooks. Events are delivered in batches and include authentication, user lifecycle, app, MFA, admin, and provisioning events.'
})
  .input(webhookEventSchema)
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
  .webhook({
    // OneLogin webhooks must be configured in the admin portal - no API for registration
    handleRequest: async ctx => {
      let body = await ctx.request.json();

      // OneLogin Event Broadcaster sends batches of events as an array
      let events = Array.isArray(body) ? body : [body];

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
        }))
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

import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';
import { slackEventsTriggerGroup } from './eventsTriggerGroup';

let slackSubteam = z
  .object({
    id: z.string(),
    team_id: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    handle: z.string().optional(),
    is_external: z.boolean().optional(),
    date_create: z.number().optional(),
    date_update: z.number().optional(),
    date_delete: z.number().optional(),
    created_by: z.string().optional(),
    updated_by: z.string().optional(),
    user_count: z.number().optional()
  })
  .loose();

let slackSubteamLifecycleEvent = z
  .object({
    type: z.union([z.literal('subteam_created'), z.literal('subteam_updated')]),
    event_ts: z.string().optional(),
    subteam: slackSubteam
  })
  .loose();

let slackSubteamMembersChangedEvent = z
  .object({
    type: z.literal('subteam_members_changed'),
    subteam_id: z.string(),
    team_id: z.string().optional(),
    date_previous_update: z.number().optional(),
    date_update: z.number().optional(),
    added_users: z.array(z.string()).optional(),
    removed_users: z.array(z.string()).optional(),
    event_ts: z.string().optional()
  })
  .loose();

let subteamOutput = z.object({
  userGroupId: z.string().describe('User group (subteam) ID'),
  name: z.string().optional().describe('User group name'),
  handle: z.string().optional().describe('User group handle'),
  description: z.string().optional().describe('User group description'),
  isExternal: z.boolean().optional().describe('Whether the group is shared externally'),
  userCount: z.number().optional().describe('Number of members'),
  createdBy: z.string().optional().describe('User ID who created the group'),
  updatedBy: z.string().optional().describe('User ID who last updated the group')
});

export let userGroupCreated = SlateTrigger.create(spec, {
  name: 'User Group Created',
  key: 'user_group_created',
  description: 'Triggers when a new user group (subteam) is created.'
})
  .scopes(slackActionScopes.userGroupEvents)
  .triggerGroup(slackEventsTriggerGroup)
  .input(slackSubteamLifecycleEvent)
  .output(subteamOutput)
  .matches(payload => (payload as { type?: unknown }).type === 'subteam_created')
  .map(async ctx => {
    let subteam = ctx.input.subteam;
    return {
      type: 'user_group.created',
      id: `user-group-created-${subteam.id}-${subteam.date_create ?? Date.now()}`,
      output: {
        userGroupId: subteam.id,
        name: subteam.name,
        handle: subteam.handle,
        description: subteam.description,
        isExternal: subteam.is_external,
        userCount: subteam.user_count,
        createdBy: subteam.created_by,
        updatedBy: subteam.updated_by
      }
    };
  })
  .build();

export let userGroupUpdated = SlateTrigger.create(spec, {
  name: 'User Group Updated',
  key: 'user_group_updated',
  description: 'Triggers when a user group (subteam) is renamed, edited, enabled, or disabled.'
})
  .scopes(slackActionScopes.userGroupEvents)
  .triggerGroup(slackEventsTriggerGroup)
  .input(slackSubteamLifecycleEvent)
  .output(subteamOutput)
  .matches(payload => (payload as { type?: unknown }).type === 'subteam_updated')
  .map(async ctx => {
    let subteam = ctx.input.subteam;
    return {
      type: 'user_group.updated',
      id: `user-group-updated-${subteam.id}-${subteam.date_update ?? Date.now()}`,
      output: {
        userGroupId: subteam.id,
        name: subteam.name,
        handle: subteam.handle,
        description: subteam.description,
        isExternal: subteam.is_external,
        userCount: subteam.user_count,
        createdBy: subteam.created_by,
        updatedBy: subteam.updated_by
      }
    };
  })
  .build();

export let userGroupMembersChanged = SlateTrigger.create(spec, {
  name: 'User Group Membership Changed',
  key: 'user_group_members_changed',
  description: 'Triggers when members are added to or removed from a user group (subteam).'
})
  .scopes(slackActionScopes.userGroupEvents)
  .triggerGroup(slackEventsTriggerGroup)
  .input(slackSubteamMembersChangedEvent)
  .output(
    z.object({
      userGroupId: z.string().describe('User group (subteam) ID'),
      addedUserIds: z.array(z.string()).describe('User IDs added to the group'),
      removedUserIds: z.array(z.string()).describe('User IDs removed from the group')
    })
  )
  .matches(payload => (payload as { type?: unknown }).type === 'subteam_members_changed')
  .map(async ctx => {
    let event = ctx.input;
    return {
      type: 'user_group.members_changed',
      id: `user-group-members-${event.subteam_id}-${event.date_update ?? Date.now()}`,
      output: {
        userGroupId: event.subteam_id,
        addedUserIds: event.added_users ?? [],
        removedUserIds: event.removed_users ?? []
      }
    };
  })
  .build();

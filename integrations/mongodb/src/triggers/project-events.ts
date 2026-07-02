import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { AtlasClient } from '../lib/client';
import { spec } from '../spec';

export let projectEventsTrigger = SlateTrigger.create(spec, {
  name: 'Project Events',
  key: 'project_events',
  description:
    '[Polling fallback] Polls for new activity feed events in a MongoDB Atlas project. Detects configuration changes, user actions, cluster state changes, backup events, and system events.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique identifier of the event'),
      eventTypeName: z.string().describe('Type of event'),
      created: z.string().describe('ISO 8601 timestamp of the event'),
      groupId: z.string().optional().describe('Project ID'),
      orgId: z.string().optional().describe('Organization ID'),
      userId: z.string().optional().describe('User who triggered the event'),
      username: z.string().optional().describe('Username who triggered the event'),
      clusterName: z.string().optional().describe('Related cluster name'),
      targetUsername: z.string().optional().describe('Target user of the event'),
      remoteAddress: z.string().optional().describe('IP address of the event source'),
      isGlobalAdmin: z.boolean().optional().describe('Whether triggered by global admin')
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('Unique identifier of the event'),
      eventTypeName: z.string().describe('Type of event'),
      created: z.string().describe('ISO 8601 timestamp of the event'),
      groupId: z.string().optional().describe('Project ID'),
      orgId: z.string().optional().describe('Organization ID'),
      userId: z.string().optional().describe('User who triggered the event'),
      username: z.string().optional().describe('Username who triggered the event'),
      clusterName: z.string().optional().describe('Related cluster name'),
      targetUsername: z.string().optional().describe('Target user of the event'),
      remoteAddress: z.string().optional().describe('Source IP address')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let projectId = ctx.config.projectId;
      if (!projectId)
        throw new Error('projectId is required in configuration for project events polling');

      let client = new AtlasClient(ctx.auth);

      let state = ctx.state as { lastEventDate?: string } | undefined;
      let params: any = {
        itemsPerPage: 100
      };

      if (state?.lastEventDate) {
        params.minDate = state.lastEventDate;
      }

      let result = await client.listProjectEvents(projectId, params);
      let events = result.results || [];

      // Filter out events we've already seen (minDate is inclusive)
      let lastDate = state?.lastEventDate;
      if (lastDate) {
        events = events.filter((e: any) => e.created > lastDate);
      }

      let inputs = events.map((e: any) => ({
        eventId: e.id,
        eventTypeName: e.eventTypeName,
        created: e.created,
        groupId: e.groupId,
        orgId: e.orgId,
        userId: e.userId,
        username: e.username,
        clusterName: e.clusterName,
        targetUsername: e.targetUsername,
        remoteAddress: e.remoteAddress,
        isGlobalAdmin: e.isGlobalAdmin
      }));

      let newLastDate = lastDate;
      if (events.length > 0) {
        // Find the most recent event date
        let maxDate = events.reduce((max: string, e: any) => {
          return e.created > max ? e.created : max;
        }, events[0].created);
        newLastDate = maxDate;
      }

      return {
        inputs,
        updatedState: {
          lastEventDate: newLastDate || new Date().toISOString()
        }
      };
    },

    handleEvent: async ctx => {
      let eventCategory = categorizeEvent(ctx.input.eventTypeName);

      return {
        type: `project.${eventCategory}`,
        id: ctx.input.eventId,
        output: {
          eventId: ctx.input.eventId,
          eventTypeName: ctx.input.eventTypeName,
          created: ctx.input.created,
          groupId: ctx.input.groupId,
          orgId: ctx.input.orgId,
          userId: ctx.input.userId,
          username: ctx.input.username,
          clusterName: ctx.input.clusterName,
          targetUsername: ctx.input.targetUsername,
          remoteAddress: ctx.input.remoteAddress
        }
      };
    }
  })
  .build();

let categorizeEvent = (eventTypeName: string): string => {
  let lower = eventTypeName.toLowerCase();
  if (lower.includes('cluster') || lower.includes('replicaset') || lower.includes('shard'))
    return 'cluster_change';
  if (lower.includes('user') || lower.includes('team') || lower.includes('invite'))
    return 'user_change';
  if (lower.includes('backup') || lower.includes('snapshot') || lower.includes('restore'))
    return 'backup_event';
  if (lower.includes('alert')) return 'alert_change';
  if (
    lower.includes('network') ||
    lower.includes('peer') ||
    lower.includes('endpoint') ||
    lower.includes('access_list')
  )
    return 'network_change';
  if (lower.includes('index') || lower.includes('search')) return 'index_change';
  return 'activity';
};

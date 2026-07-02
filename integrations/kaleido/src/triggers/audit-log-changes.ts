import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { KaleidoClient } from '../lib/client';
import { spec } from '../spec';

export let auditLogChanges = SlateTrigger.create(spec, {
  name: 'Audit Log Changes',
  key: 'audit_log_changes',
  description:
    'Fires when new audit log entries are recorded for your organization or a specific consortium. Tracks resource CRUD operations such as invitations, memberships, nodes, environments, and services being created, updated, or deleted.'
})
  .input(
    z.object({
      auditLogId: z.string().describe('Unique audit log entry ID'),
      action: z.string().describe('Action performed (create, update, delete, etc.)'),
      resourceType: z.string().describe('Type of resource affected'),
      resourceId: z.string().optional().describe('ID of the affected resource'),
      consortiumId: z.string().optional().describe('Consortium context'),
      userId: z.string().optional().describe('User who performed the action'),
      orgId: z.string().optional().describe('Organization of the user'),
      timestamp: z.string().optional().describe('When the action occurred'),
      rawEntry: z.any().describe('Full raw audit log entry')
    })
  )
  .output(
    z.object({
      auditLogId: z.string().describe('Audit log entry ID'),
      action: z.string().describe('Action performed'),
      resourceType: z.string().describe('Type of resource affected'),
      resourceId: z.string().optional().describe('ID of the affected resource'),
      consortiumId: z.string().optional().describe('Consortium context'),
      userId: z.string().optional().describe('User who performed the action'),
      orgId: z.string().optional().describe('Organization of the user'),
      timestamp: z.string().optional().describe('When the action occurred'),
      message: z.string().optional().describe('Human-readable description of the change')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new KaleidoClient({
        token: ctx.auth.token,
        region: ctx.config.region
      });

      let lastTimestamp = ctx.state?.lastTimestamp as string | undefined;
      let lastSeenIds = (ctx.state?.lastSeenIds || []) as string[];

      let logs = await client.listAuditLogs({ limit: 50 });

      if (!Array.isArray(logs) || logs.length === 0) {
        return {
          inputs: [],
          updatedState: {
            lastTimestamp,
            lastSeenIds
          }
        };
      }

      let newEntries = logs.filter((l: any) => {
        let entryId = l._id;
        if (lastSeenIds.includes(entryId)) return false;
        if (lastTimestamp) {
          let entryTime = l.created_at || l.timestamp;
          if (entryTime && entryTime <= lastTimestamp) return false;
        }
        return true;
      });

      let inputs = newEntries.map((l: any) => ({
        auditLogId: l._id || `${l.created_at || Date.now()}`,
        action: l.action || 'unknown',
        resourceType: l.resource_type || l.type || 'unknown',
        resourceId: l.resource_id || undefined,
        consortiumId: l.consortium_id || undefined,
        userId: l.user_id || undefined,
        orgId: l.org_id || undefined,
        timestamp: l.created_at || l.timestamp || undefined,
        rawEntry: l
      }));

      let newTimestamp = lastTimestamp;
      let newIds: string[] = [];
      if (logs.length > 0) {
        let latestEntry = logs[0];
        newTimestamp = latestEntry.created_at || latestEntry.timestamp || lastTimestamp;
        newIds = logs
          .slice(0, 50)
          .map((l: any) => l._id)
          .filter(Boolean);
      }

      return {
        inputs,
        updatedState: {
          lastTimestamp: newTimestamp,
          lastSeenIds: newIds
        }
      };
    },

    handleEvent: async ctx => {
      let actionLabel = ctx.input.action || 'unknown';
      let resourceType = ctx.input.resourceType || 'resource';

      return {
        type: `${resourceType}.${actionLabel}`,
        id: ctx.input.auditLogId,
        output: {
          auditLogId: ctx.input.auditLogId,
          action: ctx.input.action,
          resourceType: ctx.input.resourceType,
          resourceId: ctx.input.resourceId,
          consortiumId: ctx.input.consortiumId,
          userId: ctx.input.userId,
          orgId: ctx.input.orgId,
          timestamp: ctx.input.timestamp,
          message: `${actionLabel} ${resourceType}${ctx.input.resourceId ? ` (${ctx.input.resourceId})` : ''}`
        }
      };
    }
  })
  .build();

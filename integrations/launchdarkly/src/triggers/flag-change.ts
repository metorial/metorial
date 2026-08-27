import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { LaunchDarklyClient } from '../lib/client';
import { parseResourceSpecifiers } from '../lib/resource-specifier';
import { spec } from '../spec';

const AUDIT_LOG_PAGE_SIZE = 20;
const MAX_AUDIT_LOG_PAGES_PER_POLL = 10;

export let flagChangeTrigger = SlateTrigger.create(spec, {
  name: 'Flag Changes',
  key: 'flag_changes',
  description:
    '[Polling fallback] Polls the LaunchDarkly audit log for feature flag changes. Triggers when flags are created, updated, toggled, or deleted. Useful when webhook setup is not possible.'
})
  .input(
    z.object({
      action: z.string().describe('The action performed on the flag'),
      flagName: z.string().describe('Name of the flag'),
      flagKey: z.string().optional().describe('Key of the flag'),
      projectKey: z.string().optional().describe('Project key'),
      environmentKey: z.string().optional().describe('Environment key'),
      description: z.string().describe('Description of the change'),
      memberEmail: z.string().optional().describe('Email of the member who made the change'),
      memberName: z.string().optional().describe('Name of the member'),
      date: z.string().describe('Timestamp of the change'),
      auditLogEntryId: z.string().describe('Audit log entry ID')
    })
  )
  .output(
    z.object({
      action: z.string().describe('The action performed'),
      flagName: z.string().describe('Name of the flag'),
      flagKey: z.string().optional().describe('Key of the flag'),
      projectKey: z.string().optional().describe('Project key'),
      environmentKey: z.string().optional().describe('Environment key'),
      description: z.string().describe('Description of the change'),
      memberEmail: z.string().optional().describe('Email of the member'),
      memberName: z.string().optional().describe('Name of the member'),
      date: z.string().describe('Timestamp of the change')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new LaunchDarklyClient(ctx.auth.token, ctx.auth.baseUrl);
      let state = ctx.state as { lastTimestamp?: number } | undefined;
      let lastTimestamp = state?.lastTimestamp;

      let params: Record<string, any> = {
        limit: AUDIT_LOG_PAGE_SIZE,
        spec: 'proj/*:env/*:flag/*'
      };

      if (lastTimestamp) {
        params.after = lastTimestamp;
      }

      let result = await client.getAuditLogEntries(params);
      let items = result.items ?? [];

      if (lastTimestamp) {
        let page = items;
        for (
          let pageNumber = 1;
          page.length === AUDIT_LOG_PAGE_SIZE && pageNumber < MAX_AUDIT_LOG_PAGES_PER_POLL;
          pageNumber++
        ) {
          let oldestDate = Math.min(
            ...page.map((entry: any) =>
              typeof entry.date === 'number' ? entry.date : Number.parseInt(entry.date, 10)
            )
          );
          if (!Number.isFinite(oldestDate) || oldestDate <= lastTimestamp) break;

          let nextResult = await client.getAuditLogEntries({
            ...params,
            before: oldestDate
          });
          page = nextResult.items ?? [];
          items.push(...page);
        }
      }

      if (items.length === 0) {
        return {
          inputs: [],
          updatedState: { lastTimestamp: lastTimestamp ?? Date.now() }
        };
      }

      let newTimestamp = items.reduce((max: number, entry: any) => {
        let entryDate =
          typeof entry.date === 'number' ? entry.date : Number.parseInt(entry.date, 10);
        return entryDate > max ? entryDate : max;
      }, lastTimestamp ?? 0);

      let inputs = items.map((entry: any) => {
        let { projectKey, environmentKey, flagKey } = parseResourceSpecifiers(
          entry.target?.resources
        );

        return {
          action: entry.titleVerb ?? 'changed',
          flagName: entry.name ?? '',
          flagKey,
          projectKey,
          environmentKey,
          description: entry.description ?? entry.shortDescription ?? '',
          memberEmail: entry.member?.email,
          memberName: entry.member?.firstName
            ? `${entry.member.firstName} ${entry.member.lastName ?? ''}`.trim()
            : undefined,
          date: String(entry.date),
          auditLogEntryId: entry._id
        };
      });

      return {
        inputs,
        updatedState: { lastTimestamp: newTimestamp }
      };
    },

    handleEvent: async ctx => {
      let action = ctx.input.action.toLowerCase().replace(/\s+/g, '_');

      return {
        type: `flag.${action}`,
        id: ctx.input.auditLogEntryId,
        output: {
          action: ctx.input.action,
          flagName: ctx.input.flagName,
          flagKey: ctx.input.flagKey,
          projectKey: ctx.input.projectKey,
          environmentKey: ctx.input.environmentKey,
          description: ctx.input.description,
          memberEmail: ctx.input.memberEmail,
          memberName: ctx.input.memberName,
          date: ctx.input.date
        }
      };
    }
  })
  .build();

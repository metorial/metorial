import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { NerdGraphClient } from '../lib/client';
import { spec } from '../spec';

export let alertIssues = SlateTrigger.create(spec, {
  name: 'Alert Issues',
  key: 'alert_issues',
  description:
    'Triggers when alert issues are created, updated, acknowledged, or closed in New Relic. Polls for issue state changes.'
})
  .input(
    z.object({
      issueId: z.string().describe('Alert issue ID'),
      title: z.string().optional().describe('Issue title'),
      state: z.string().describe('Issue state: ACTIVATED, ACKNOWLEDGED, CLOSED'),
      priority: z.string().optional().describe('Issue priority'),
      activatedAt: z.string().optional().describe('When the issue was first activated'),
      closedAt: z.string().optional().describe('When the issue was closed'),
      acknowledgedAt: z.string().optional().describe('When the issue was acknowledged'),
      updatedAt: z.string().optional().describe('When the issue was last updated'),
      entityGuids: z
        .array(z.string())
        .optional()
        .describe('Entity GUIDs associated with this issue'),
      entityNames: z
        .array(z.string())
        .optional()
        .describe('Entity names associated with this issue'),
      conditionName: z
        .string()
        .optional()
        .describe('Alert condition that triggered this issue'),
      policyName: z.string().optional().describe('Alert policy name'),
      previousState: z
        .string()
        .optional()
        .describe('Previous state of the issue (for change detection)')
    })
  )
  .output(
    z.object({
      issueId: z.string().describe('Alert issue ID'),
      title: z.string().optional().describe('Issue title'),
      state: z.string().describe('Current issue state'),
      priority: z.string().optional().describe('Issue priority'),
      activatedAt: z.string().optional().describe('When the issue was activated'),
      closedAt: z.string().optional().describe('When the issue was closed'),
      acknowledgedAt: z.string().optional().describe('When the issue was acknowledged'),
      updatedAt: z.string().optional().describe('When the issue was last updated'),
      entityGuids: z
        .array(z.string())
        .optional()
        .describe('Entity GUIDs associated with this issue'),
      entityNames: z
        .array(z.string())
        .optional()
        .describe('Entity names associated with this issue'),
      conditionName: z
        .string()
        .optional()
        .describe('Alert condition that triggered this issue'),
      policyName: z.string().optional().describe('Alert policy name')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new NerdGraphClient({
        token: ctx.auth.token,
        region: ctx.config.region,
        accountId: ctx.config.accountId
      });

      let previousIssueStates: Record<string, string> = ctx.state?.issueStates || {};
      let _lastPollTime: string | undefined = ctx.state?.lastPollTime;

      let result = await client.listAlertIssues();
      let issues = result?.issues || [];

      let inputs: any[] = [];

      for (let issue of issues) {
        let previousState = previousIssueStates[issue.issueId];
        let currentState = issue.state;

        // Emit if new issue or state changed
        if (!previousState || previousState !== currentState) {
          inputs.push({
            issueId: issue.issueId,
            title: issue.title,
            state: currentState,
            priority: issue.priority,
            activatedAt: issue.activatedAt,
            closedAt: issue.closedAt,
            acknowledgedAt: issue.acknowledgedAt,
            updatedAt: issue.updatedAt,
            entityGuids: issue.entityGuids,
            entityNames: issue.entityNames,
            conditionName: issue.conditionName,
            policyName: issue.policyName,
            previousState: previousState || null
          });
        }
      }

      // Update known states
      let updatedIssueStates: Record<string, string> = {};
      for (let issue of issues) {
        updatedIssueStates[issue.issueId] = issue.state;
      }

      return {
        inputs,
        updatedState: {
          issueStates: updatedIssueStates,
          lastPollTime: new Date().toISOString()
        }
      };
    },

    handleEvent: async ctx => {
      let { state, previousState } = ctx.input;

      let eventType = 'issue.updated';
      if (!previousState) {
        eventType = 'issue.activated';
      } else if (state === 'CLOSED' && previousState !== 'CLOSED') {
        eventType = 'issue.closed';
      } else if (state === 'ACKNOWLEDGED' && previousState !== 'ACKNOWLEDGED') {
        eventType = 'issue.acknowledged';
      }

      // Dedupe ID includes state so each state change is unique
      let dedupeId = `${ctx.input.issueId}-${state}-${ctx.input.updatedAt || ''}`;

      return {
        type: eventType,
        id: dedupeId,
        output: {
          issueId: ctx.input.issueId,
          title: ctx.input.title,
          state: ctx.input.state,
          priority: ctx.input.priority,
          activatedAt: ctx.input.activatedAt,
          closedAt: ctx.input.closedAt,
          acknowledgedAt: ctx.input.acknowledgedAt,
          updatedAt: ctx.input.updatedAt,
          entityGuids: ctx.input.entityGuids,
          entityNames: ctx.input.entityNames,
          conditionName: ctx.input.conditionName,
          policyName: ctx.input.policyName
        }
      };
    }
  })
  .build();

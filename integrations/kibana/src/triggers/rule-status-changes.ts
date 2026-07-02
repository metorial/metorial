import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let ruleStatusChanges = SlateTrigger.create(spec, {
  name: 'Rule Status Changes',
  key: 'rule_status_changes',
  description:
    'Triggers when alerting rules change status, are created, updated, enabled, or disabled. Polls the Kibana alerting rules API to detect changes.'
})
  .input(
    z.object({
      changeType: z
        .enum(['created', 'updated', 'enabled', 'disabled', 'status_changed'])
        .describe('Type of change detected'),
      ruleId: z.string().describe('ID of the affected rule'),
      ruleName: z.string().describe('Name of the rule'),
      ruleTypeId: z.string().describe('Type of the rule'),
      enabled: z.boolean().describe('Whether the rule is currently enabled'),
      executionStatus: z.string().optional().describe('Current execution status'),
      lastExecutionDate: z.string().optional().describe('Last execution timestamp'),
      updatedAt: z.string().describe('Last update timestamp'),
      tags: z.array(z.string()).describe('Rule tags')
    })
  )
  .output(
    z.object({
      ruleId: z.string().describe('ID of the affected rule'),
      ruleName: z.string().describe('Name of the rule'),
      ruleTypeId: z.string().describe('Type of the rule'),
      consumer: z.string().optional().describe('Consumer application'),
      enabled: z.boolean().describe('Whether the rule is currently enabled'),
      executionStatus: z.string().optional().describe('Current execution status'),
      lastExecutionDate: z.string().optional().describe('Last execution timestamp'),
      schedule: z
        .object({
          interval: z.string()
        })
        .optional()
        .describe('Rule schedule'),
      tags: z.array(z.string()).describe('Rule tags'),
      updatedAt: z.string().describe('Last update timestamp'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createClient(ctx);

      let state = ctx.state ?? {};
      let lastPollTime = state.lastPollTime as string | undefined;
      let knownRules = (state.knownRules ?? {}) as Record<
        string,
        { updatedAt: string; enabled: boolean; executionStatus: string }
      >;

      let result = await client.findRules({
        perPage: 100,
        sortField: 'updatedAt',
        sortOrder: 'desc'
      });

      let rules = result.data ?? [];
      let inputs: Array<{
        changeType: 'created' | 'updated' | 'enabled' | 'disabled' | 'status_changed';
        ruleId: string;
        ruleName: string;
        ruleTypeId: string;
        enabled: boolean;
        executionStatus: string | undefined;
        lastExecutionDate: string | undefined;
        updatedAt: string;
        tags: string[];
      }> = [];

      let newKnownRules: Record<
        string,
        { updatedAt: string; enabled: boolean; executionStatus: string }
      > = {};

      for (let rule of rules) {
        let ruleId = rule.id;
        let updatedAt = rule.updated_at ?? '';
        let enabled = rule.enabled ?? false;
        let executionStatus = rule.execution_status?.status ?? '';
        let known = knownRules[ruleId];

        newKnownRules[ruleId] = { updatedAt, enabled, executionStatus };

        if (!lastPollTime) continue;

        if (!known) {
          inputs.push({
            changeType: 'created',
            ruleId,
            ruleName: rule.name,
            ruleTypeId: rule.rule_type_id,
            enabled,
            executionStatus,
            lastExecutionDate: rule.execution_status?.last_execution_date,
            updatedAt,
            tags: rule.tags ?? []
          });
        } else if (known.updatedAt !== updatedAt) {
          let changeType: 'updated' | 'enabled' | 'disabled' | 'status_changed' = 'updated';
          if (known.enabled !== enabled) {
            changeType = enabled ? 'enabled' : 'disabled';
          } else if (known.executionStatus !== executionStatus) {
            changeType = 'status_changed';
          }

          inputs.push({
            changeType,
            ruleId,
            ruleName: rule.name,
            ruleTypeId: rule.rule_type_id,
            enabled,
            executionStatus,
            lastExecutionDate: rule.execution_status?.last_execution_date,
            updatedAt,
            tags: rule.tags ?? []
          });
        }
      }

      return {
        inputs,
        updatedState: {
          lastPollTime: new Date().toISOString(),
          knownRules: newKnownRules
        }
      };
    },

    handleEvent: async ctx => {
      let client = createClient(ctx);
      let input = ctx.input;

      let ruleDetails: any = {};
      try {
        ruleDetails = await client.getRule(input.ruleId);
      } catch {
        // Rule may have been deleted
      }

      return {
        type: `rule.${input.changeType}`,
        id: `${input.ruleId}-${input.updatedAt}`,
        output: {
          ruleId: input.ruleId,
          ruleName: input.ruleName,
          ruleTypeId: input.ruleTypeId,
          consumer: ruleDetails.consumer,
          enabled: input.enabled,
          executionStatus: input.executionStatus,
          lastExecutionDate: input.lastExecutionDate,
          schedule: ruleDetails.schedule,
          tags: input.tags,
          updatedAt: input.updatedAt,
          createdAt: ruleDetails.created_at
        }
      };
    }
  })
  .build();

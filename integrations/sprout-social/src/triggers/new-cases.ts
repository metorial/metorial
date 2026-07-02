import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newCases = SlateTrigger.create(spec, {
  name: 'New Cases',
  key: 'new_cases',
  description: 'Triggers when new customer care cases are created or updated in Sprout Social.'
})
  .input(
    z.object({
      caseId: z.string().describe('Unique identifier for the case.'),
      eventType: z
        .enum(['created', 'updated'])
        .describe('Whether the case is new or was updated.'),
      status: z.string().optional().describe('Case status (OPEN, ON_HOLD, CLOSED).'),
      priority: z.string().optional().describe('Case priority.'),
      caseType: z
        .string()
        .optional()
        .describe('Case type (GENERAL, SUPPORT, LEAD, QUESTION, FEEDBACK).'),
      createdTime: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp when the case was created.'),
      updatedTime: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp when the case was last updated.'),
      raw: z.any().optional().describe('Full raw case data.')
    })
  )
  .output(
    z.object({
      caseId: z.string().describe('Unique identifier for the case.'),
      status: z.string().optional().describe('Case status.'),
      priority: z.string().optional().describe('Case priority.'),
      caseType: z.string().optional().describe('Case type.'),
      createdTime: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp when the case was created.'),
      updatedTime: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp when the case was last updated.')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        customerId: ctx.config.customerId
      });

      let lastPollTime = ctx.state?.lastPollTime as string | undefined;
      let now = new Date();

      // Cases date filter limited to 1 week max
      // Default to 1 hour ago on first poll
      let startTime = lastPollTime || new Date(now.getTime() - 3600000).toISOString();
      let endTimeStr = now.toISOString();

      // Ensure the range doesn't exceed 7 days
      let start = new Date(startTime);
      let maxStart = new Date(now.getTime() - 7 * 24 * 3600000);
      if (start < maxStart) {
        startTime = maxStart.toISOString();
      }

      let allInputs: any[] = [];

      try {
        let result = await client.getCases({
          filters: [`created_time.in(${startTime}..${endTimeStr})`],
          fields: ['status', 'priority', 'type', 'created_time', 'updated_time'],
          page: 1
        });

        let cases: any[] = result?.data ?? [];
        let knownCaseIds = (ctx.state?.knownCaseIds as string[] | undefined) || [];

        for (let caseItem of cases) {
          let caseId = String(caseItem.id || caseItem.case_id || '');
          if (!caseId) continue;

          let isNew = !knownCaseIds.includes(caseId);
          allInputs.push({
            caseId,
            eventType: isNew ? ('created' as const) : ('updated' as const),
            status: caseItem.status,
            priority: caseItem.priority,
            caseType: caseItem.type,
            createdTime: caseItem.created_time,
            updatedTime: caseItem.updated_time,
            raw: caseItem
          });
        }

        // Track known case IDs (keep last 500)
        let updatedKnownIds = [
          ...new Set([...allInputs.map(i => i.caseId), ...knownCaseIds])
        ].slice(0, 500);

        return {
          inputs: allInputs,
          updatedState: {
            ...ctx.state,
            lastPollTime: endTimeStr,
            knownCaseIds: updatedKnownIds
          }
        };
      } catch {
        return {
          inputs: [],
          updatedState: { ...ctx.state, lastPollTime: endTimeStr }
        };
      }
    },

    handleEvent: async ctx => {
      return {
        type: `case.${ctx.input.eventType}`,
        id: `${ctx.input.caseId}-${ctx.input.updatedTime || ctx.input.createdTime || Date.now()}`,
        output: {
          caseId: ctx.input.caseId,
          status: ctx.input.status,
          priority: ctx.input.priority,
          caseType: ctx.input.caseType,
          createdTime: ctx.input.createdTime,
          updatedTime: ctx.input.updatedTime
        }
      };
    }
  });

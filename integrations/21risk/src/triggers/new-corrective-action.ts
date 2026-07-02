import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newCorrectiveActionTrigger = SlateTrigger.create(spec, {
  name: 'New Corrective Action',
  key: 'new_corrective_action',
  description:
    'Triggers when a new corrective action is created in 21RISK, typically as a result of a non-compliant audit finding.'
})
  .input(
    z.object({
      actionId: z.string().describe('Unique identifier of the corrective action'),
      action: z
        .record(z.string(), z.any())
        .describe('Full corrective action record from the API')
    })
  )
  .output(
    z
      .object({
        actionId: z.string().describe('Unique identifier of the corrective action'),
        title: z.string().optional().describe('Title of the corrective action'),
        status: z.string().optional().describe('Current status of the action'),
        responsiblePerson: z.string().optional().describe('Person responsible for the action'),
        dueDate: z.string().optional().describe('Due date for the action'),
        siteId: z.string().optional().describe('Associated site ID'),
        auditId: z.string().optional().describe('Associated audit ID'),
        createdDate: z.string().optional().describe('Date the action was created')
      })
      .passthrough()
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },
    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let lastPolledAt = ctx.state?.lastPolledAt as string | undefined;

      let filterExpr = lastPolledAt ? `CreatedDate gt ${lastPolledAt}` : undefined;

      let actions = await client.getActions({
        filter: filterExpr,
        orderby: 'CreatedDate desc',
        top: 50
      });

      let results = Array.isArray(actions) ? actions : [];

      let newLastPolledAt = lastPolledAt;
      if (results.length > 0) {
        let latestDate = results[0].CreatedDate ?? results[0].createdDate;
        if (latestDate) {
          newLastPolledAt = latestDate;
        }
      }

      return {
        inputs: results.map((action: any) => ({
          actionId: String(action.Id ?? action.id ?? action.ActionId ?? action.actionId ?? ''),
          action
        })),
        updatedState: {
          lastPolledAt: newLastPolledAt ?? new Date().toISOString()
        }
      };
    },
    handleEvent: async ctx => {
      let action = ctx.input.action as Record<string, any>;

      return {
        type: 'corrective_action.created',
        id: ctx.input.actionId,
        output: {
          actionId: ctx.input.actionId,
          title: String(action.Title ?? action.title ?? action.Name ?? action.name ?? ''),
          status: String(action.Status ?? action.status ?? ''),
          responsiblePerson: String(
            action.ResponsiblePerson ?? action.responsiblePerson ?? ''
          ),
          dueDate: String(action.DueDate ?? action.dueDate ?? ''),
          siteId: String(action.SiteId ?? action.siteId ?? ''),
          auditId: String(action.AuditId ?? action.auditId ?? ''),
          createdDate: String(action.CreatedDate ?? action.createdDate ?? ''),
          ...action
        }
      };
    }
  })
  .build();

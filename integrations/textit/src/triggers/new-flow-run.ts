import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newFlowRun = SlateTrigger.create(spec, {
  name: 'New Flow Run',
  key: 'new_flow_run',
  description:
    '[Polling fallback] Triggered when new flow runs are completed or modified. Polls for recently modified runs and surfaces completed, expired, and interrupted runs.'
})
  .input(
    z.object({
      runUuid: z.string().describe('UUID of the run'),
      flowUuid: z.string().describe('UUID of the flow'),
      flowName: z.string().describe('Name of the flow'),
      contactUuid: z.string().describe('UUID of the contact'),
      contactName: z.string().describe('Name of the contact'),
      contactUrn: z.string().describe('URN of the contact'),
      responded: z.boolean().describe('Whether the contact responded'),
      values: z.record(z.string(), z.any()).describe('Values collected during the run'),
      exitType: z.string().nullable().describe('How the run exited'),
      createdOn: z.string().describe('When the run was created'),
      modifiedOn: z.string().describe('When the run was last modified'),
      exitedOn: z.string().nullable().describe('When the run exited')
    })
  )
  .output(
    z.object({
      runUuid: z.string().describe('UUID of the run'),
      flowUuid: z.string().describe('UUID of the flow'),
      flowName: z.string().describe('Name of the flow'),
      contactUuid: z.string().describe('UUID of the contact'),
      contactName: z.string().describe('Name of the contact'),
      contactUrn: z.string().describe('URN of the contact'),
      responded: z.boolean().describe('Whether the contact responded'),
      values: z.record(z.string(), z.any()).describe('Values collected during the run'),
      exitType: z
        .string()
        .nullable()
        .describe('How the run exited (completed, interrupted, expired)'),
      createdOn: z.string().describe('When the run was created'),
      modifiedOn: z.string().describe('When the run was last modified'),
      exitedOn: z.string().nullable().describe('When the run exited')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client(ctx.auth.token);
      let state = ctx.state as { lastPollTime?: string } | undefined;

      let params: { after?: string } = {};

      if (state?.lastPollTime) {
        params.after = state.lastPollTime;
      }

      let result = await client.listRuns(params);

      // Only include runs that have exited (completed, interrupted, or expired)
      let exitedRuns = result.results.filter(r => r.exited_on !== null);

      let inputs = exitedRuns.map(r => ({
        runUuid: r.uuid,
        flowUuid: r.flow.uuid,
        flowName: r.flow.name,
        contactUuid: r.contact.uuid,
        contactName: r.contact.name,
        contactUrn: r.contact.urn,
        responded: r.responded,
        values: r.values,
        exitType: r.exit_type,
        createdOn: r.created_on,
        modifiedOn: r.modified_on,
        exitedOn: r.exited_on
      }));

      let newLastPollTime =
        result.results.length > 0 ? result.results[0]!.modified_on : state?.lastPollTime;

      return {
        inputs,
        updatedState: {
          lastPollTime: newLastPollTime
        }
      };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.exitType
        ? `flow_run.${ctx.input.exitType}`
        : 'flow_run.exited';

      return {
        type: eventType,
        id: ctx.input.runUuid,
        output: {
          runUuid: ctx.input.runUuid,
          flowUuid: ctx.input.flowUuid,
          flowName: ctx.input.flowName,
          contactUuid: ctx.input.contactUuid,
          contactName: ctx.input.contactName,
          contactUrn: ctx.input.contactUrn,
          responded: ctx.input.responded,
          values: ctx.input.values,
          exitType: ctx.input.exitType,
          createdOn: ctx.input.createdOn,
          modifiedOn: ctx.input.modifiedOn,
          exitedOn: ctx.input.exitedOn
        }
      };
    }
  })
  .build();

import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { WorkdayClient } from '../lib/client';
import { spec } from '../spec';

let workdayReferenceSchema = z.object({
  id: z.string().optional().describe('Workday ID'),
  descriptor: z.string().optional().describe('Display name'),
  href: z.string().optional().describe('API href')
});

export let workerChanges = SlateTrigger.create(spec, {
  name: 'Worker Changes',
  key: 'worker_changes',
  description:
    'Detects new and updated workers in Workday by polling the workers endpoint. Triggers when workers are added or their profiles change.'
})
  .input(
    z.object({
      workerId: z.string().describe('The worker ID'),
      displayName: z.string().describe('Worker display name'),
      href: z.string().optional().describe('API href'),
      primaryWorkEmail: z.string().optional().describe('Primary work email'),
      businessTitle: z.string().optional().describe('Business title'),
      supervisoryOrganization: workdayReferenceSchema
        .optional()
        .describe('Primary supervisory organization'),
      isNew: z.boolean().describe('Whether this worker was newly detected')
    })
  )
  .output(
    z.object({
      workerId: z.string().describe('The worker ID'),
      displayName: z.string().describe('Worker display name'),
      href: z.string().optional().describe('API href'),
      primaryWorkEmail: z.string().optional().describe('Primary work email'),
      businessTitle: z.string().optional().describe('Business title'),
      supervisoryOrganization: workdayReferenceSchema
        .optional()
        .describe('Primary supervisory organization')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new WorkdayClient({
        token: ctx.auth.token,
        baseUrl: ctx.config.baseUrl,
        tenant: ctx.config.tenant
      });

      let state = (ctx.input.state as { knownWorkerIds?: string[] } | null) ?? {};
      let knownWorkerIds = new Set(state.knownWorkerIds ?? []);
      let isFirstRun = knownWorkerIds.size === 0;

      let allWorkers: Array<{
        id: string;
        descriptor: string;
        href?: string;
        primaryWorkEmail?: string;
        businessTitle?: string;
        primarySupervisoryOrganization?: { id?: string; descriptor?: string; href?: string };
      }> = [];

      let offset = 0;
      let limit = 100;
      let hasMore = true;

      while (hasMore) {
        let result = await client.listWorkers({ limit, offset });
        allWorkers.push(...result.data);
        offset += limit;
        hasMore = result.data.length === limit && offset < result.total;

        if (offset > 1000) break;
      }

      let currentWorkerIds = new Set(allWorkers.map(w => w.id));
      let inputs: Array<{
        workerId: string;
        displayName: string;
        href?: string;
        primaryWorkEmail?: string;
        businessTitle?: string;
        supervisoryOrganization?: { id?: string; descriptor?: string; href?: string };
        isNew: boolean;
      }> = [];

      if (!isFirstRun) {
        for (let worker of allWorkers) {
          if (!knownWorkerIds.has(worker.id)) {
            inputs.push({
              workerId: worker.id,
              displayName: worker.descriptor,
              href: worker.href,
              primaryWorkEmail: worker.primaryWorkEmail,
              businessTitle: worker.businessTitle,
              supervisoryOrganization: worker.primarySupervisoryOrganization,
              isNew: true
            });
          }
        }
      }

      return {
        inputs,
        updatedState: {
          knownWorkerIds: Array.from(currentWorkerIds)
        }
      };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.isNew ? 'worker.created' : 'worker.updated';

      return {
        type: eventType,
        id: `${eventType}_${ctx.input.workerId}_${Date.now()}`,
        output: {
          workerId: ctx.input.workerId,
          displayName: ctx.input.displayName,
          href: ctx.input.href,
          primaryWorkEmail: ctx.input.primaryWorkEmail,
          businessTitle: ctx.input.businessTitle,
          supervisoryOrganization: ctx.input.supervisoryOrganization
        }
      };
    }
  })
  .build();

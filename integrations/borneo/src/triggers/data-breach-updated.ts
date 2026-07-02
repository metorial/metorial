import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let dataBreachUpdated = SlateTrigger.create(spec, {
  name: 'Data Breach Updated',
  key: 'data_breach_updated',
  description:
    'Triggers when a new data breach is created or an existing breach record is updated. Polls for recent changes to breach evaluation records.'
})
  .input(
    z.object({
      breachId: z.string().describe('Data breach ID'),
      status: z.string().optional().describe('Breach status'),
      updatedAt: z.string().optional().describe('When the breach was last updated'),
      breach: z.any().describe('Full breach data')
    })
  )
  .output(
    z
      .object({
        breachId: z.string().describe('ID of the data breach'),
        name: z.string().optional().describe('Breach name'),
        status: z.string().optional().describe('Breach status'),
        severity: z.string().optional().describe('Breach severity'),
        updatedAt: z.string().optional().describe('When the breach was last updated')
      })
      .passthrough()
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        baseUrl: ctx.config.baseUrl
      });

      let lastPollTime = ctx.state?.lastPollTime as string | undefined;

      let result = await client.listDataBreaches({
        page: 0,
        size: 50,
        sortBy: 'updatedAt',
        sortOrder: 'desc'
      });

      let data = result?.data ?? result;
      let breaches: any[] = Array.isArray(data) ? data : (data?.content ?? data?.items ?? []);

      let newBreaches = breaches.filter((breach: any) => {
        if (!lastPollTime) return true;
        let breachTime = breach?.updatedAt ?? breach?.createdAt;
        return breachTime && breachTime > lastPollTime;
      });

      let latestTime = lastPollTime;
      for (let breach of newBreaches) {
        let breachTime = breach?.updatedAt ?? breach?.createdAt;
        if (breachTime && (!latestTime || breachTime > latestTime)) {
          latestTime = breachTime;
        }
      }

      return {
        inputs: newBreaches.map((breach: any) => ({
          breachId: breach.id ?? '',
          status: breach.status,
          updatedAt: breach.updatedAt ?? breach.createdAt,
          breach
        })),
        updatedState: {
          lastPollTime: latestTime ?? new Date().toISOString()
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'data_breach.updated',
        id: ctx.input.breachId,
        output: {
          breachId: ctx.input.breachId,
          name: ctx.input.breach?.name,
          status: ctx.input.status,
          severity: ctx.input.breach?.severity,
          updatedAt: ctx.input.updatedAt,
          ...ctx.input.breach
        }
      };
    }
  })
  .build();

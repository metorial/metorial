import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newTechnologyDetection = SlateTrigger.create(spec, {
  name: 'New Technology Detection',
  key: 'new_technology_detection',
  description:
    'Triggers when new websites are detected using a specific technology. Polls the BuiltWith Lists API periodically to discover newly detected domains.'
})
  .input(
    z.object({
      domain: z.string().describe('Domain where the technology was detected'),
      technology: z.string().describe('Technology name'),
      detectedAt: z.string().optional().describe('When the detection was made')
    })
  )
  .output(
    z.object({
      domain: z.string().describe('Domain where the technology was detected'),
      technology: z.string().describe('Technology name that was detected'),
      detectedAt: z
        .string()
        .optional()
        .describe('When the technology was first detected on the domain')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let state = ctx.input.state as { lastPolled?: string; technology?: string } | null;
      let lastPolled = state?.lastPolled;
      let technology = state?.technology ?? 'Shopify';
      let now = Date.now().toString();

      let data = await client.lists({
        technology,
        since: lastPolled
      });

      let results = data?.Results ?? [];

      let inputs = results.map((result: any) => ({
        domain: result?.D ?? result?.Domain ?? result?.domain ?? '',
        technology,
        detectedAt: result?.FD ?? result?.FirstDetected ?? result?.firstDetected ?? undefined
      }));

      return {
        inputs,
        updatedState: {
          lastPolled: now,
          technology
        }
      };
    },

    handleEvent: async ctx => {
      let domainId = ctx.input.domain || 'unknown';

      return {
        type: 'technology.detected',
        id: `${ctx.input.technology}-${domainId}-${ctx.input.detectedAt ?? Date.now()}`,
        output: {
          domain: ctx.input.domain,
          technology: ctx.input.technology,
          detectedAt: ctx.input.detectedAt
        }
      };
    }
  });

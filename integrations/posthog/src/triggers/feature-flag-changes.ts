import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let featureFlagChangesTrigger = SlateTrigger.create(spec, {
  name: 'Feature Flag Changes',
  key: 'feature_flag_changes',
  description:
    'Triggers when feature flags are created or updated. Polls for feature flags and detects changes by comparing with the previously known state.'
})
  .input(
    z.object({
      changeType: z
        .enum(['created', 'updated'])
        .describe('Whether the flag was created or updated'),
      flagId: z.string().describe('Feature flag ID'),
      key: z.string().describe('Feature flag key'),
      name: z.string().optional().describe('Feature flag name'),
      active: z.boolean().describe('Whether the flag is active')
    })
  )
  .output(
    z.object({
      flagId: z.string().describe('Feature flag ID'),
      key: z.string().describe('Feature flag key used in code'),
      name: z.string().optional().describe('Feature flag display name'),
      active: z.boolean().describe('Whether the flag is currently active'),
      rolloutPercentage: z.number().optional().describe('Rollout percentage'),
      filters: z.record(z.string(), z.any()).optional().describe('Flag targeting filters')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createClient(ctx.config, ctx.auth);

      let data = await client.listFeatureFlags({ limit: 100 });
      let flags = data.results || [];

      let knownFlags: Record<string, string> = ctx.state?.knownFlags || {};
      let inputs: Array<{
        changeType: 'created' | 'updated';
        flagId: string;
        key: string;
        name?: string;
        active: boolean;
        rolloutPercentage?: number;
        filters?: Record<string, any>;
      }> = [];

      let newKnownFlags: Record<string, string> = {};

      for (let flag of flags) {
        let flagId = String(flag.id);
        let updatedAt = flag.updated_at || flag.created_at || '';
        newKnownFlags[flagId] = updatedAt;

        if (!knownFlags[flagId]) {
          inputs.push({
            changeType: 'created',
            flagId,
            key: flag.key,
            name: flag.name,
            active: flag.active,
            rolloutPercentage: flag.rollout_percentage,
            filters: flag.filters
          });
        } else if (knownFlags[flagId] !== updatedAt) {
          inputs.push({
            changeType: 'updated',
            flagId,
            key: flag.key,
            name: flag.name,
            active: flag.active,
            rolloutPercentage: flag.rollout_percentage,
            filters: flag.filters
          });
        }
      }

      return {
        inputs,
        updatedState: { knownFlags: newKnownFlags }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `feature_flag.${ctx.input.changeType}`,
        id: `${ctx.input.flagId}-${ctx.input.changeType}-${Date.now()}`,
        output: {
          flagId: ctx.input.flagId,
          key: ctx.input.key,
          name: ctx.input.name,
          active: ctx.input.active,
          rolloutPercentage: (ctx.input as any).rolloutPercentage,
          filters: (ctx.input as any).filters
        }
      };
    }
  })
  .build();

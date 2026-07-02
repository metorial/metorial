import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let impressionSchema = z.object({
  evaluatedKey: z.string().describe('The user/entity key that was evaluated.'),
  flagName: z.string().describe('Name of the feature flag.'),
  environmentId: z.string().describe('Environment ID.'),
  environmentName: z.string().describe('Environment name.'),
  treatment: z.string().describe('Treatment served to this key.'),
  timestamp: z.number().describe('SDK evaluation timestamp.'),
  bucketingKey: z.string().optional().describe('Key used for bucketing/hashing.'),
  label: z.string().optional().describe('Targeting rule that was applied.'),
  sdk: z.string().optional().describe('SDK language (e.g., "javascript").'),
  sdkVersion: z.string().optional().describe('SDK version.')
});

export let impressions = SlateTrigger.create(spec, {
  name: 'Impressions',
  key: 'impressions',
  description:
    'Triggers when feature flag impressions (evaluations) are recorded. Impressions are sent in batches approximately every 10 seconds. Configure the "Outgoing webhook (Impressions)" integration in Split UI to point to this trigger\'s URL.'
})
  .input(impressionSchema)
  .output(
    z.object({
      evaluatedKey: z.string().describe('The evaluated user/entity key.'),
      flagName: z.string().describe('Feature flag name.'),
      environmentName: z.string().describe('Environment where the evaluation occurred.'),
      treatment: z.string().describe('Treatment served.'),
      timestamp: z.number().describe('Evaluation timestamp.'),
      label: z.string().optional().describe('Applied targeting rule.'),
      sdk: z.string().optional().describe('SDK language.'),
      sdkVersion: z.string().optional().describe('SDK version.')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      // Impressions webhook sends a JSON array of impression objects
      let items: any[] = Array.isArray(body) ? body : [body];

      return {
        inputs: items.map(item => ({
          evaluatedKey: item.key ?? '',
          flagName: item.split ?? '',
          environmentId: item.environmentId ?? '',
          environmentName: item.environmentName ?? '',
          treatment: item.treatment ?? '',
          timestamp: item.time ?? 0,
          bucketingKey: item.bucketingKey,
          label: item.label,
          sdk: item.sdk,
          sdkVersion: item.sdkVersion
        }))
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'impression.recorded',
        id: `${ctx.input.flagName}-${ctx.input.evaluatedKey}-${ctx.input.timestamp}`,
        output: {
          evaluatedKey: ctx.input.evaluatedKey,
          flagName: ctx.input.flagName,
          environmentName: ctx.input.environmentName,
          treatment: ctx.input.treatment,
          timestamp: ctx.input.timestamp,
          label: ctx.input.label,
          sdk: ctx.input.sdk,
          sdkVersion: ctx.input.sdkVersion
        }
      };
    }
  })
  .build();

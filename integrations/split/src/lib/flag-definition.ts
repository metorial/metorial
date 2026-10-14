import { z } from 'zod';
import type { FlagDefinition, Matcher } from './client';

let treatmentSchema = z.object({
  treatmentName: z.string(),
  description: z.string().optional(),
  configurations: z.string().optional(),
  keys: z.array(z.string()).optional(),
  segments: z.array(z.string()).optional()
});

let bucketSchema = z.object({ treatment: z.string(), size: z.number() });

let matcherSchema = z.object({
  negate: z.boolean().optional(),
  type: z.string(),
  attribute: z.string().optional(),
  string: z.string().optional(),
  bool: z.boolean().optional(),
  strings: z.array(z.string()).optional(),
  number: z.number().optional(),
  date: z.number().optional(),
  between: z.object({ from: z.number(), to: z.number() }).optional(),
  semverBetween: z.object({ from: z.string(), to: z.string() }).optional(),
  depends: z.object({ splitName: z.string(), treatment: z.string() }).optional()
});

export let flagDefinitionSchema = z.object({
  environmentName: z.string(),
  environmentId: z.string(),
  killed: z.boolean(),
  treatments: z.array(treatmentSchema),
  defaultTreatment: z.string(),
  baselineTreatment: z.string().optional(),
  trafficAllocation: z.number(),
  rules: z.array(
    z.object({
      buckets: z.array(bucketSchema),
      condition: z.object({ combiner: z.string(), matchers: z.array(matcherSchema) })
    })
  ),
  defaultRule: z.array(bucketSchema),
  lastUpdateTime: z.number(),
  impressionsDisabled: z.boolean().optional(),
  creationTime: z.number().optional(),
  lastTrafficReceivedAt: z.number().optional()
});

let mapMatcher = (matcher: Matcher) => ({
  ...matcher,
  between:
    matcher.between &&
    typeof matcher.between.from === 'number' &&
    typeof matcher.between.to === 'number'
      ? (matcher.between as { from: number; to: number })
      : undefined,
  semverBetween:
    matcher.between &&
    typeof matcher.between.from === 'string' &&
    typeof matcher.between.to === 'string'
      ? (matcher.between as { from: string; to: string })
      : undefined
});

export let mapFlagDefinition = (
  definition: FlagDefinition
): z.infer<typeof flagDefinitionSchema> => ({
  environmentName: definition.environment.name,
  environmentId: definition.environment.id,
  killed: definition.killed,
  treatments: definition.treatments.map(treatment => ({
    treatmentName: treatment.name,
    description: treatment.description ?? undefined,
    configurations: treatment.configurations ?? undefined,
    keys: treatment.keys ?? undefined,
    segments: treatment.segments ?? undefined
  })),
  defaultTreatment: definition.defaultTreatment,
  baselineTreatment: definition.baselineTreatment ?? undefined,
  trafficAllocation: definition.trafficAllocation,
  rules: definition.rules.map(rule => ({
    buckets: rule.buckets,
    condition: {
      combiner: rule.condition.combiner,
      matchers: rule.condition.matchers.map(mapMatcher)
    }
  })),
  defaultRule: definition.defaultRule,
  lastUpdateTime: definition.lastUpdateTime,
  impressionsDisabled: definition.impressionsDisabled,
  creationTime: definition.creationTime,
  lastTrafficReceivedAt: definition.lastTrafficReceivedAt
});

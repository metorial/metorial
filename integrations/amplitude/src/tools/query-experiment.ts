import { SlateTool } from 'slates';
import { z } from 'zod';
import { createAmplitudeClient } from '../lib/client';
import { amplitudeServiceError, unexpectedAmplitudeResponse } from '../lib/errors';
import { parseResponse, validateDateRange } from '../lib/rest-validation';
import { spec } from '../spec';

const secondsPerDay = 86400;
const method = 'reconstructed_exposure_filtered_funnel';
const userCountSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const cacheMetadataSchema = z.object({
  timeComputed: z
    .number()
    .finite()
    .nullable()
    .describe(
      'Provider-reported computation time in Unix milliseconds; null when unavailable.'
    ),
  wasCached: z
    .boolean()
    .nullable()
    .describe('Whether the provider reports a cached response; null when unavailable.'),
  cacheFreshness: z
    .string()
    .nullable()
    .describe('Unmodified provider cache freshness label; null when unavailable.')
});
const variantResultSchema = z.object({
  variant: z.string(),
  exposedUsers: userCountSchema.describe(
    'Unique users who completed the filtered exposure step across the whole date range.'
  ),
  convertedUsers: userCountSchema.describe(
    'Unique exposed users who completed the outcome step within the conversion window.'
  ),
  conversionRate: z
    .number()
    .min(0)
    .max(1)
    .nullable()
    .describe('convertedUsers / exposedUsers, or null when no users were exposed.'),
  cacheMetadata: cacheMetadataSchema.describe(
    'Available provider cache metadata for this variant query.'
  )
});
const completenessMetadataSchema = z.object({
  minSampleRate: z.number().min(0).max(1).optional(),
  realtimeDataMissing: z.boolean().optional(),
  timedOutRealtimeData: z.boolean().optional(),
  prunedResult: z.boolean().optional(),
  hitChunkGroupByLimit: z.boolean().optional(),
  missedCacheAndNotComputed: z.boolean().optional(),
  externalDataMissing: z.boolean().optional(),
  timedOutRealtime: z.boolean().optional(),
  qtsMetadata: z.object({ qtsRate: z.number().min(0).max(1).optional() }).optional()
});
const funnelResponseSchema = completenessMetadataSchema.extend({
  ...cacheMetadataSchema.partial().shape,
  data: z
    .array(z.object({ cumulativeRaw: z.tuple([userCountSchema, userCountSchema]) }))
    .max(1),
  numSeries: z.number().int().nonnegative().optional(),
  perQueryMetadata: z.array(completenessMetadataSchema).optional()
});
const inputSchema = z.object({
  flagKey: z.string().min(1).describe('Exact flag key stored on qualifying exposure events.'),
  exposureEvent: z.string().min(1).describe('Exact event name representing flag exposure.'),
  flagProperty: z
    .string()
    .min(1)
    .describe('Exact exposure event property containing the flag key.'),
  variantProperty: z
    .string()
    .min(1)
    .describe(
      'Exact exposure event property containing the variant; distinct from flagProperty.'
    ),
  controlVariant: z
    .string()
    .min(1)
    .describe('Exact control value in variantProperty, distinct from treatmentVariant.'),
  treatmentVariant: z
    .string()
    .min(1)
    .describe('Exact treatment value in variantProperty, distinct from controlVariant.'),
  outcomeEvent: z.string().min(1).describe('Exact event name representing conversion.'),
  start: z.string().describe('First date included in the funnel query, in YYYYMMDD format.'),
  end: z.string().describe('Last date included in the funnel query, in YYYYMMDD format.'),
  conversionWindowDays: z
    .number()
    .finite()
    .positive()
    .max(Number.MAX_SAFE_INTEGER / secondsPerDay)
    .describe(
      'Positive conversion window in days from a qualifying exposure. Fractional days must resolve to a positive safe integer number of seconds.'
    )
});

const parseVariantResult = (response: unknown, variant: string) => {
  let operation = `experiment funnel for variant ${variant}`;
  let result = parseResponse(funnelResponseSchema, response, operation);
  if (
    [result, ...(result.perQueryMetadata ?? [])].some(
      metadata =>
        (metadata.minSampleRate !== undefined && metadata.minSampleRate < 1) ||
        (metadata.qtsMetadata?.qtsRate !== undefined && metadata.qtsMetadata.qtsRate < 1) ||
        metadata.realtimeDataMissing ||
        metadata.timedOutRealtimeData ||
        metadata.prunedResult ||
        metadata.hitChunkGroupByLimit ||
        metadata.missedCacheAndNotComputed ||
        metadata.externalDataMissing ||
        metadata.timedOutRealtime
    )
  )
    throw amplitudeServiceError(
      `Amplitude returned incomplete or sampled results for ${operation}. Retry after ingestion finishes or narrow the query before comparing variants.`,
      { reason: 'amplitude_incomplete_response' }
    );
  if (result.numSeries !== undefined && result.numSeries !== result.data.length)
    throw unexpectedAmplitudeResponse(operation);
  let counts = result.data[0]?.cumulativeRaw;
  // Live empty queries return no funnel and explicitly report zero series.
  if (counts === undefined && result.numSeries !== 0)
    throw unexpectedAmplitudeResponse(operation);
  let [exposedUsers, convertedUsers] = counts ?? [0, 0];
  if (convertedUsers > exposedUsers) throw unexpectedAmplitudeResponse(operation);
  return {
    variant,
    exposedUsers,
    convertedUsers,
    conversionRate: exposedUsers === 0 ? null : convertedUsers / exposedUsers,
    cacheMetadata: {
      timeComputed: result.timeComputed ?? null,
      wasCached: result.wasCached ?? null,
      cacheFreshness: result.cacheFreshness ?? null
    }
  };
};

export let queryExperimentTool = SlateTool.create(spec, {
  name: 'Query Experiment',
  key: 'query_experiment',
  description:
    'Reconstruct a descriptive control-versus-treatment conversion comparison from explicit exposure and outcome events. Runs two independent ordered funnels filtered by exact flag and variant event properties, and returns whole-range unique counts, conversion rates, and lift. Requires the Analytics API key and secret; no Experiment management key is needed.',
  instructions: [
    'Supply the exact flag key, exposure event, flag and variant event properties, variants, outcome event, date range, and conversion window. Native experiment metric configuration is not discovered or inferred.',
    'Each variant is queried as an independent two-step ordered funnel. A user exposed to both variants can appear in both results.',
    'The conversion window starts at a qualifying exposure under Analytics funnel semantics. This does not reproduce native first-exposure assignment or attribution.',
    "Check each variant's cacheMetadata when available. Provider caching can delay newly ingested events, and independent variant queries may reflect different computation times.",
    'Counts use whole-range cumulativeRaw users, never summed daily counts. An explicitly empty response with zero series represents zero users. Lift is descriptive; the output does not provide native experiment statistics, significance, p-values, or causal inference.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .authMethods(['api_key_secret'])
  .input(inputSchema)
  .output(
    z.object({
      control: variantResultSchema,
      treatment: variantResultSchema,
      absoluteLift: z
        .number()
        .nullable()
        .describe(
          'Treatment conversion rate minus control conversion rate, as a fraction; null when either rate is undefined.'
        ),
      relativeLift: z
        .number()
        .nullable()
        .describe(
          'Absolute lift divided by control conversion rate, as a fraction; null when either rate is undefined or the control rate is zero.'
        ),
      method: z.literal(method),
      provenance: inputSchema.extend({
        source: z.literal('Amplitude Dashboard REST API /api/2/funnels'),
        countField: z.literal('cumulativeRaw'),
        mode: z.literal('ordered')
      }),
      limitations: z.array(z.string())
    })
  )
  .handleInvocation(async ctx => {
    let input = ctx.input;
    for (let [field, value] of Object.entries(input)) {
      if (typeof value === 'string' && !value.trim())
        throw amplitudeServiceError(`${field} must not be blank.`);
    }
    if (input.flagProperty === input.variantProperty)
      throw amplitudeServiceError(
        'flagProperty and variantProperty must be distinct event properties.'
      );
    if (input.controlVariant === input.treatmentVariant)
      throw amplitudeServiceError(
        'controlVariant and treatmentVariant must be distinct values.'
      );
    validateDateRange(input.start, input.end);
    let conversionWindowSeconds = input.conversionWindowDays * secondsPerDay;
    if (!Number.isSafeInteger(conversionWindowSeconds) || conversionWindowSeconds <= 0)
      throw amplitudeServiceError(
        'conversionWindowDays must resolve to a positive safe integer number of seconds.'
      );

    let client = createAmplitudeClient(ctx);
    let queryVariant = async (variant: string) => {
      let response = await client.getFunnelAnalysis({
        e: JSON.stringify([
          {
            event_type: input.exposureEvent,
            filters: [
              {
                subprop_type: 'event',
                subprop_key: input.flagProperty,
                subprop_op: 'is',
                subprop_value: [input.flagKey]
              },
              {
                subprop_type: 'event',
                subprop_key: input.variantProperty,
                subprop_op: 'is',
                subprop_value: [variant]
              }
            ]
          },
          { event_type: input.outcomeEvent }
        ]),
        start: input.start,
        end: input.end,
        mode: 'ordered',
        conversionWindow: String(input.conversionWindowDays)
      });
      return parseVariantResult(response, variant);
    };
    let [control, treatment] = await Promise.all([
      queryVariant(input.controlVariant),
      queryVariant(input.treatmentVariant)
    ]);
    let absoluteLift =
      control.conversionRate === null || treatment.conversionRate === null
        ? null
        : treatment.conversionRate - control.conversionRate;
    let relativeLift =
      absoluteLift === null || control.conversionRate === null || control.conversionRate === 0
        ? null
        : absoluteLift / control.conversionRate;

    return {
      output: {
        control,
        treatment,
        absoluteLift,
        relativeLift,
        method,
        provenance: {
          ...input,
          source: 'Amplitude Dashboard REST API /api/2/funnels' as const,
          countField: 'cumulativeRaw' as const,
          mode: 'ordered' as const
        },
        limitations: [
          'Provider caching can delay newly ingested events. Independent variant queries may reflect different computation times; cacheMetadata preserves the available provider cache metadata.',
          'This is a reconstructed comparison using the supplied metric definition; native experiment metric configuration is not discovered or inferred.',
          'The two variant funnels are independent. Crossover users can appear in both variants and are not excluded or assigned to one variant.',
          'The conversion window runs from a qualifying exposure under Analytics funnel semantics; this is not native first-exposure assignment or attribution.',
          'Nonempty counts are whole-range unique users from cumulativeRaw, not sums of daily counts. An explicitly empty response with zero series represents zero users. Date boundaries and user identity follow the Analytics project settings.',
          'Lift is descriptive. Native experiment statistics, significance, p-values, confidence intervals, and causal inference are not provided.'
        ]
      },
      message: `Reconstructed exposure-filtered funnel comparison completed for **${input.start}** to **${input.end}**. Lift is descriptive.`
    };
  })
  .build();

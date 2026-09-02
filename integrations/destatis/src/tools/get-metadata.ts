import { SlateTool } from 'slates';
import { z } from 'zod';
import { GenesisClient } from '../lib/client';
import { destatisValidationError } from '../lib/errors';
import { spec } from '../spec';
import { optionalProviderCount, optionalProviderText, requireProviderText } from './shared';

let metadataObjectTypeSchema = z.enum([
  'table',
  'cube',
  'statistic',
  'time_series',
  'variable',
  'value'
]);

let areaSchema = z.enum(['public', 'user', 'all']);

let boundedCode = z
  .string()
  .trim()
  .min(1, 'Enter a non-empty object code.')
  .max(15, 'Object codes are at most 15 characters.')
  .describe('Destatis GENESIS-Online object code, from search_catalog.');

let getMetadataInputSchema = z.object({
  objectType: metadataObjectTypeSchema.describe(
    'Type of statistical object whose structure and metadata should be returned.'
  ),
  code: boundedCode,
  area: areaSchema
    .optional()
    .default('public')
    .describe('Catalogue area containing the object. Uses the public area by default.')
});

let dimensionSchema = z.object({
  code: z.string().describe('Stable provider code for this dimension.'),
  title: z.string().describe('Human-readable provider title for this dimension.'),
  type: z.string().optional().describe('Provider-reported dimension type.'),
  valueCount: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe('Number of available values reported for this dimension.'),
  selectedCount: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe('Number of selected values reported for this dimension.')
});

type RecordValue = Record<string, unknown>;
type Dimension = z.infer<typeof dimensionSchema>;

let isRecord = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let recordsFrom = (value: unknown): RecordValue[] => {
  if (Array.isArray(value)) return value.filter(isRecord);
  return isRecord(value) ? [value] : [];
};

let mapDimension = (value: RecordValue): Dimension | undefined => {
  let code = optionalProviderText(value.Code);
  let title = optionalProviderText(value.Content);
  if (!code || !title) return undefined;

  let type = optionalProviderText(value.Type);
  let valueCount = optionalProviderCount(value.Values);
  let selectedCount = optionalProviderCount(value.Selected);
  return {
    code,
    title,
    ...(type ? { type } : {}),
    ...(valueCount !== undefined ? { valueCount } : {}),
    ...(selectedCount !== undefined ? { selectedCount } : {})
  };
};

let mapTimeRange = (value: unknown) => {
  let direct = optionalProviderText(value);
  if (direct) return direct;
  if (!isRecord(value)) return undefined;

  let from = optionalProviderText(value.From);
  let to = optionalProviderText(value.To);
  if (from && to) return `${from}-${to}`;
  return from ?? to;
};

let dimensionSources = (
  metadata: RecordValue,
  objectType: z.infer<typeof metadataObjectTypeSchema>
) => {
  let structure = isRecord(metadata.Structure) ? metadata.Structure : undefined;
  if (objectType === 'table') {
    return [structure?.Columns, structure?.Rows, metadata.Columns, metadata.Rows];
  }
  if (objectType === 'cube') {
    return [structure?.Axis, metadata.Axes, structure?.Dimensions];
  }
  return [];
};

let summarizeDimensions = (
  metadata: RecordValue,
  objectType: z.infer<typeof metadataObjectTypeSchema>
) => {
  let dimensions: Dimension[] = [];
  let seen = new Set<string>();
  for (let source of dimensionSources(metadata, objectType)) {
    for (let record of recordsFrom(source)) {
      let dimension = mapDimension(record);
      if (!dimension || seen.has(dimension.code)) continue;
      seen.add(dimension.code);
      dimensions.push(dimension);
    }
  }
  return dimensions.length > 0 ? dimensions : undefined;
};

export let getMetadata = SlateTool.create(spec, {
  name: 'Get Metadata',
  key: 'get_metadata',
  description:
    'Inspect a Destatis GENESIS-Online object and return its stable identity, time coverage, and table or cube dimensions alongside provider-specific metadata.',
  instructions: [
    'Use search_catalog first when you do not already know the object code and type.',
    'When a dimension reports a value count but does not enumerate value codes, call list_variable_values with that dimension code before building a filtered download.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(getMetadataInputSchema)
  .output(
    z.object({
      objectType: metadataObjectTypeSchema.describe('Requested statistical object type.'),
      code: z.string().describe('Stable provider code reported for this object.'),
      title: z.string().optional().describe('Human-readable provider title.'),
      updatedAt: z.string().optional().describe('Provider-reported last update time.'),
      timeRange: z
        .string()
        .optional()
        .describe('Available time span reported by the provider.'),
      dimensions: z
        .array(dimensionSchema)
        .optional()
        .describe('Table or cube dimensions reported by the provider.'),
      metadata: z
        .record(z.string(), z.unknown())
        .describe('Provider metadata for resource-specific statistical semantics.'),
      warning: z.string().optional().describe('Non-fatal provider warning.'),
      copyright: z.string().optional().describe('Provider copyright and attribution notice.')
    })
  )
  .handleInvocation(async ctx => {
    let parsed = getMetadataInputSchema.safeParse(ctx.input);
    if (!parsed.success) {
      let detail = parsed.error.issues[0]?.message ?? 'Invalid metadata input.';
      throw destatisValidationError(`Invalid metadata input: ${detail}`);
    }

    let client = new GenesisClient({ token: ctx.auth.token });
    let result = await client.getMetadata({
      language: ctx.config.language,
      objectType: parsed.data.objectType,
      code: parsed.data.code,
      area: parsed.data.area
    });
    if (!isRecord(result.data)) {
      throw destatisValidationError(
        'Destatis GENESIS-Online returned invalid metadata for this object.'
      );
    }

    let code = requireProviderText(result.data.Code, 'code');
    let title = optionalProviderText(result.data.Content);
    let updatedAt = optionalProviderText(result.data.Updated);
    let timeRange = mapTimeRange(result.data.Time);
    let dimensions = summarizeDimensions(result.data, parsed.data.objectType);

    return {
      output: {
        objectType: parsed.data.objectType,
        code,
        ...(title ? { title } : {}),
        ...(updatedAt ? { updatedAt } : {}),
        ...(timeRange ? { timeRange } : {}),
        ...(dimensions ? { dimensions } : {}),
        metadata: result.data,
        ...(result.warning ? { warning: result.warning } : {}),
        ...(result.copyright ? { copyright: result.copyright } : {})
      },
      message: `Retrieved metadata for **${code}**.`
    };
  })
  .build();

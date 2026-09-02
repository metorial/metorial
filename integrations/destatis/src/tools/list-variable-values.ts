import { SlateTool } from 'slates';
import { z } from 'zod';
import { GenesisClient } from '../lib/client';
import { destatisValidationError } from '../lib/errors';
import { spec } from '../spec';
import {
  boundedPageLength,
  optionalProviderBoolean,
  optionalProviderCount,
  requireProviderText
} from './shared';

let boundedSelection = (description: string) =>
  z
    .string()
    .trim()
    .min(1, 'Enter a non-empty value.')
    .max(15, 'Enter at most 15 characters.')
    .describe(description);

let criterionSchema = z.enum(['code', 'content']);
let areaSchema = z.enum(['public', 'user', 'all']);

let listVariableValuesInputSchema = z.object({
  variableCode: boundedSelection(
    'Variable code from search_catalog or a dimension returned by get_metadata.'
  ),
  selection: boundedSelection(
    'Value code or provider wildcard pattern to match. Uses * to return all values by default.'
  )
    .optional()
    .default('*'),
  searchCriterion: criterionSchema
    .optional()
    .default('code')
    .describe('Whether selection matches provider value codes or titles.'),
  sortCriterion: criterionSchema
    .optional()
    .default('code')
    .describe('Whether values are sorted by provider code or title.'),
  area: areaSchema
    .optional()
    .default('public')
    .describe('Catalogue area containing the variable. Uses the public area by default.'),
  pageLength: boundedPageLength(
    100,
    'Maximum number of variable values to return, from 1 to 1000.'
  )
});

let variableValueSchema = z.object({
  code: z.string().describe('Stable provider code for this variable value.'),
  title: z.string().describe('Human-readable provider title for this variable value.'),
  variableCount: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe('Number of related variables reported by the provider.'),
  hasInformation: z
    .boolean()
    .optional()
    .describe('Whether the provider reports additional information for this value.')
});

type RecordValue = Record<string, unknown>;

let isRecord = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let mapVariableValue = (value: RecordValue): z.infer<typeof variableValueSchema> => {
  let variableCount = optionalProviderCount(value.Variables);
  let hasInformation = optionalProviderBoolean(value.Information);
  return {
    code: requireProviderText(value.Code, 'code'),
    title: requireProviderText(value.Content, 'title'),
    ...(variableCount !== undefined ? { variableCount } : {}),
    ...(hasInformation !== undefined ? { hasInformation } : {})
  };
};

export let listVariableValues = SlateTool.create(spec, {
  name: 'List Variable Values',
  key: 'list_variable_values',
  description:
    'List valid Destatis GENESIS-Online value codes for a variable so those codes can be used in filtered statistical data downloads.',
  instructions: [
    'Use get_metadata to discover variable or dimension codes before listing their values.',
    'Pass the returned value codes to the matching regional or classifying selection in a download tool.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(listVariableValuesInputSchema)
  .output(
    z.object({
      variableCode: z.string().describe('Variable code whose values were returned.'),
      values: z.array(variableValueSchema).describe('Matching provider values.'),
      warning: z.string().optional().describe('Non-fatal provider warning.'),
      copyright: z.string().optional().describe('Provider copyright and attribution notice.')
    })
  )
  .handleInvocation(async ctx => {
    let parsed = listVariableValuesInputSchema.safeParse(ctx.input);
    if (!parsed.success) {
      let detail = parsed.error.issues[0]?.message ?? 'Invalid variable value input.';
      throw destatisValidationError(`Invalid variable value input: ${detail}`);
    }

    let client = new GenesisClient({ token: ctx.auth.token });
    let result = await client.listVariableValues({
      language: ctx.config.language,
      variableCode: parsed.data.variableCode,
      selection: parsed.data.selection,
      searchCriterion: parsed.data.searchCriterion,
      sortCriterion: parsed.data.sortCriterion,
      area: parsed.data.area,
      pageLength: parsed.data.pageLength,
      allowNoResult: true
    });
    if (!Array.isArray(result.data) || !result.data.every(isRecord)) {
      throw destatisValidationError(
        'Destatis GENESIS-Online returned an invalid variable value list.'
      );
    }
    let values = result.data.map(mapVariableValue);

    return {
      output: {
        variableCode: parsed.data.variableCode,
        values,
        ...(result.warning ? { warning: result.warning } : {}),
        ...(result.copyright ? { copyright: result.copyright } : {})
      },
      message: `Found **${values.length}** values for **${parsed.data.variableCode}**.`
    };
  })
  .build();

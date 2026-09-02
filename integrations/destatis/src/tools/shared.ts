import { z } from 'zod';
import { destatisValidationError } from '../lib/errors';
import { hasUnsafeGenesisCodeCharacters } from '../lib/selections';

export let trimmedRequiredString = (description: string) =>
  z.string().trim().min(1, 'Enter a non-empty value.').describe(description);

export let boundedPageLength = (defaultValue: number, description: string) =>
  z.number().int().min(1).max(1000).optional().default(defaultValue).describe(description);

export let boundedTrimmedString = (maximumLength: number, description: string) =>
  z
    .string()
    .trim()
    .min(1, 'Enter a non-empty value.')
    .max(maximumLength, `Enter at most ${maximumLength} characters.`)
    .describe(description);

let atomicCodeSchema = (maximumLength: number, description: string) =>
  boundedTrimmedString(maximumLength, description).refine(
    value => !hasUnsafeGenesisCodeCharacters(value),
    'Commas and control characters are not valid inside a code.'
  );

let duplicateCodeIndexes = (values: string[]) => {
  let seen = new Set<string>();
  let duplicates: number[] = [];
  for (let [index, value] of values.entries()) {
    if (seen.has(value)) duplicates.push(index);
    seen.add(value);
  }
  return duplicates;
};

export let areaSchema = z
  .enum(['public', 'user', 'all'])
  .optional()
  .default('public')
  .describe('GENESIS-Online data area. Public data is used by default.');

let selectionSchema = (maximumValueCodeLength: number) =>
  z.object({
    variableCode: atomicCodeSchema(
      6,
      'Variable code. Use get_metadata to identify dimensions.'
    ),
    valueCodes: z
      .array(
        atomicCodeSchema(
          maximumValueCodeLength,
          'Value code or provider wildcard. Use list_variable_values to discover codes.'
        )
      )
      .min(1, 'Select at least one value code.')
      .superRefine((values, context) => {
        for (let index of duplicateCodeIndexes(values)) {
          context.addIssue({
            code: 'custom',
            path: [index],
            message: `Duplicate code ${values[index]}.`
          });
        }
      })
      .describe('Value codes to include for this variable.')
  });

export let regionalSelectionSchema = selectionSchema(8)
  .optional()
  .describe('Optional regional variable and values used to filter the download.');

export let classifyingSelectionsSchema = (maximumSelections: number) =>
  z
    .array(selectionSchema(15))
    .min(1)
    .max(maximumSelections)
    .superRefine((selections, context) => {
      let seen = new Set<string>();
      for (let [index, selection] of selections.entries()) {
        if (seen.has(selection.variableCode)) {
          context.addIssue({
            code: 'custom',
            path: [index, 'variableCode'],
            message: `Duplicate variable code ${selection.variableCode}.`
          });
        }
        seen.add(selection.variableCode);
      }
    })
    .optional()
    .describe(
      `Optional classifying-variable filters, with at most ${maximumSelections} entries.`
    );

export let contentsSchema = z
  .array(
    atomicCodeSchema(
      6,
      'Content code to include. Use get_metadata to discover table or cube contents.'
    )
  )
  .min(1)
  .superRefine((values, context) => {
    for (let index of duplicateCodeIndexes(values)) {
      context.addIssue({
        code: 'custom',
        path: [index],
        message: `Duplicate code ${values[index]}.`
      });
    }
  })
  .optional()
  .describe('Content codes to include in the downloaded data.');

let yearPattern = /^(\d{4})(?:\/(\d{2}))?$/;

export let yearSchema = z
  .string()
  .trim()
  .regex(yearPattern, 'Use YYYY or YYYY/YY.')
  .refine(value => {
    let year = Number(yearPattern.exec(value)?.[1]);
    return Number.isInteger(year) && year >= 1900 && year <= 2100;
  }, 'The leading year must be from 1900 through 2100.');

let yearOrderValue = (value: string) => {
  let match = yearPattern.exec(value);
  if (!match) return Number.NaN;
  let leadingYear = Number(match[1]);
  let suffix = match[2] === undefined ? leadingYear % 100 : Number(match[2]);
  return leadingYear * 100 + suffix;
};

export let validateYearOrder = (
  startYear: string | undefined,
  endYear: string | undefined
) => {
  if (startYear && endYear && yearOrderValue(startYear) > yearOrderValue(endYear)) {
    throw destatisValidationError('startYear must not be later than endYear.');
  }
};

let updatedAfterPattern = /^(\d{2})\.(\d{2})\.(\d{4})(?: ([01]\d|2[0-3]):([0-5]\d))?$/;

let isLeapYear = (year: number) => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

export let updatedAfterSchema = z
  .string()
  .trim()
  .refine(value => {
    let match = updatedAfterPattern.exec(value);
    if (!match) return false;
    let day = Number(match[1]);
    let month = Number(match[2]);
    let year = Number(match[3]);
    if (year < 1 || month < 1 || month > 12) return false;
    let daysInMonth = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][
      month - 1
    ];
    return daysInMonth !== undefined && day >= 1 && day <= daysInMonth;
  }, 'Use a real calendar date in dd.mm.yyyy or dd.mm.yyyy hh:mm format.')
  .optional()
  .describe(
    'Return data updated after this real calendar date (dd.mm.yyyy or dd.mm.yyyy hh:mm).'
  );

export let requireProviderText = (value: unknown, field: string) => {
  if (typeof value === 'string' && value.trim()) return value.trim();
  throw destatisValidationError(
    `Destatis GENESIS-Online returned a catalogue item without a valid ${field}.`
  );
};

export let optionalProviderText = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

export let optionalProviderCount = (value: unknown) => {
  let count =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && /^\d+$/.test(value.trim())
        ? Number(value.trim())
        : undefined;
  return typeof count === 'number' && Number.isSafeInteger(count) && count >= 0
    ? count
    : undefined;
};

export let optionalProviderBoolean = (value: unknown) => {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return undefined;
  let normalized = value.trim().toLocaleLowerCase('en');
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return undefined;
};

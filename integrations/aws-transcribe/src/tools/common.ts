import { z } from 'zod';
import { transcribeServiceError } from '../lib/errors';

export let tagSchema = z.object({
  key: z.string().describe('Tag key'),
  value: z.string().describe('Tag value')
});

export let mediaFormatSchema = z.enum([
  'mp3',
  'mp4',
  'wav',
  'flac',
  'ogg',
  'amr',
  'webm',
  'm4a'
]);

export let kmsEncryptionContextSchema = z
  .record(z.string(), z.string())
  .optional()
  .describe('Optional AWS KMS encryption context key-value pairs');

export let languageIdSettingSchema = z.object({
  languageModelName: z
    .string()
    .optional()
    .describe('Custom language model for this detected language'),
  vocabularyName: z
    .string()
    .optional()
    .describe('Custom vocabulary for this detected language'),
  vocabularyFilterName: z
    .string()
    .optional()
    .describe('Custom vocabulary filter for this detected language')
});

export let languageIdSettingsSchema = z
  .record(z.string(), languageIdSettingSchema)
  .optional()
  .describe(
    'Automatic language identification settings keyed by language code. Use with languageOptions.'
  );

export let timeRangeSchema = z.object({
  first: z
    .number()
    .optional()
    .describe(
      'Beginning of the range, in milliseconds for absolute ranges or percent for relative ranges'
    ),
  last: z
    .number()
    .optional()
    .describe(
      'End of the range, in milliseconds for absolute ranges or percent for relative ranges'
    )
});

export let callAnalyticsRuleSchema = z.object({
  ruleType: z
    .enum(['transcript', 'sentiment', 'interruption', 'non_talk_time'])
    .describe('Call Analytics category rule type'),
  targets: z
    .array(z.string())
    .optional()
    .describe('Transcript phrases to match. Required when ruleType is transcript.'),
  transcriptFilterType: z
    .enum(['EXACT'])
    .optional()
    .describe('Transcript match type. AWS currently supports EXACT.'),
  sentiments: z
    .array(z.enum(['POSITIVE', 'NEGATIVE', 'NEUTRAL', 'MIXED']))
    .optional()
    .describe('Sentiments to match. Required when ruleType is sentiment.'),
  participantRole: z
    .enum(['AGENT', 'CUSTOMER'])
    .optional()
    .describe('Participant role to evaluate. Omit to evaluate both participants.'),
  negate: z
    .boolean()
    .optional()
    .describe('Whether the rule should match absence instead of presence'),
  threshold: z
    .number()
    .optional()
    .describe('Milliseconds threshold for interruption or non-talk-time rules'),
  absoluteTimeRange: timeRangeSchema
    .optional()
    .describe('Absolute time range to evaluate, in milliseconds'),
  relativeTimeRange: timeRangeSchema
    .optional()
    .describe('Relative time range to evaluate, in percent')
});

export let requireString = (value: unknown, message: string): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw transcribeServiceError(message);
  }

  return value;
};

export let requireArray = <T>(value: T[] | undefined, message: string): T[] => {
  if (!Array.isArray(value) || value.length === 0) {
    throw transcribeServiceError(message);
  }

  return value;
};

export let ensureExactlyOne = (checks: [string, boolean][], message: string) => {
  let present = checks.filter(([, value]) => value).map(([label]) => label);
  if (present.length !== 1) {
    throw transcribeServiceError(`${message} Received: ${present.join(', ') || 'none'}.`);
  }
};

export let ensureNotBoth = (
  first: unknown,
  firstLabel: string,
  second: unknown,
  secondLabel: string
) => {
  if (first !== undefined && second !== undefined) {
    throw transcribeServiceError(`Provide either ${firstLabel} or ${secondLabel}, not both.`);
  }
};

export let validateLanguageIdSettings = (
  languageIdSettings: Record<string, unknown> | undefined,
  languageOptions: string[] | undefined,
  options?: { allowLanguageModel?: boolean }
) => {
  if (!languageIdSettings) {
    return;
  }

  let entries = Object.entries(languageIdSettings);
  if (entries.length < 2 || entries.length > 5) {
    throw transcribeServiceError(
      'languageIdSettings must include between 2 and 5 language codes.'
    );
  }

  if (!languageOptions?.length) {
    throw transcribeServiceError(
      'languageOptions is required when languageIdSettings is provided.'
    );
  }

  for (let [languageCode, value] of entries) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw transcribeServiceError(`languageIdSettings.${languageCode} must be an object.`);
    }

    let setting = value as {
      languageModelName?: string;
      vocabularyName?: string;
      vocabularyFilterName?: string;
    };

    if (
      !setting.languageModelName &&
      !setting.vocabularyName &&
      !setting.vocabularyFilterName
    ) {
      throw transcribeServiceError(
        `languageIdSettings.${languageCode} must include a languageModelName, vocabularyName, or vocabularyFilterName.`
      );
    }

    if (options?.allowLanguageModel === false && setting.languageModelName) {
      throw transcribeServiceError(
        'languageIdSettings.languageModelName is not supported with identifyMultipleLanguages.'
      );
    }
  }
};

export let validateVocabularyFilterMethod = (
  vocabularyFilterName: string | undefined,
  vocabularyFilterMethod: string | undefined
) => {
  if (vocabularyFilterName && !vocabularyFilterMethod) {
    throw transcribeServiceError(
      'vocabularyFilterMethod is required when vocabularyFilterName is provided.'
    );
  }
};

export let validateVocabularySource = (
  phrases: string[] | undefined,
  fileUri: string | undefined,
  fileLabel = 'vocabularyFileUri'
) => {
  ensureExactlyOne(
    [
      ['phrases/words', Array.isArray(phrases) && phrases.length > 0],
      [fileLabel, typeof fileUri === 'string' && fileUri.trim().length > 0]
    ],
    `Provide exactly one source: phrases/words or ${fileLabel}.`
  );
};

export let validateCallAnalyticsRules = (
  rules: z.infer<typeof callAnalyticsRuleSchema>[] | undefined
) => {
  let providedRules = requireArray(
    rules,
    'At least one Call Analytics category rule is required.'
  );

  if (providedRules.length > 20) {
    throw transcribeServiceError('A Call Analytics category can include at most 20 rules.');
  }

  for (let [index, rule] of providedRules.entries()) {
    ensureNotBoth(
      rule.absoluteTimeRange,
      `rules[${index}].absoluteTimeRange`,
      rule.relativeTimeRange,
      `rules[${index}].relativeTimeRange`
    );

    if (rule.ruleType === 'transcript') {
      requireArray(rule.targets, `rules[${index}].targets is required for transcript rules.`);
      continue;
    }

    if (rule.ruleType === 'sentiment') {
      requireArray(
        rule.sentiments,
        `rules[${index}].sentiments is required for sentiment rules.`
      );
      continue;
    }

    if (rule.ruleType === 'non_talk_time' && rule.participantRole) {
      throw transcribeServiceError(
        `rules[${index}].participantRole is not supported for non_talk_time rules.`
      );
    }
  }

  return providedRules;
};

import { createApiServiceError, isApiErrorRecord } from 'slates';
import { z } from 'zod';

export let rawSchema = z.record(z.string(), z.unknown());
let idSchema = z.union([z.string(), z.number().int()]);

export let parseResponse = <T extends z.ZodType>(schema: T, value: unknown): z.output<T> => {
  let result = schema.safeParse(value);
  if (!result.success) {
    throw createApiServiceError('Happy Scribe returned an unexpected response.', {
      reason: 'happy_scribe_invalid_response'
    });
  }
  return result.data;
};

export let orderSchema = z.looseObject({
  id: z.string(),
  state: z.string(),
  folder_id: idSchema.nullish(),
  operations: z.unknown().optional(),
  transcriptions: z.unknown().optional(),
  ingestions: z.unknown().optional(),
  outputsIds: z.array(z.string()).nullish(),
  failure_reason: z.string().nullish()
});

export let transcriptionSchema = z.looseObject({
  id: z.string(),
  name: z.string(),
  state: z.string(),
  language: z.string(),
  audioLengthInSeconds: z.number().nullish(),
  costInCents: z.number().nullish(),
  sharingEnabled: z.boolean().nullish(),
  tags: z.array(z.string()).nullish(),
  createdAt: z.string().nullish(),
  updatedAt: z.string().nullish(),
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
  publicUrl: z.string().nullish(),
  folder: z.looseObject({ id: idSchema, name: z.string().optional() }).nullish()
});

export let transcriptionMetadata = (value: z.output<typeof transcriptionSchema>) => {
  let { audioUrl, videoUrl, soundwaveUrl, ...metadata } = value;
  if (isApiErrorRecord(metadata._links) && isApiErrorRecord(metadata._links.self)) {
    let { downloadUrl, ...self } = metadata._links.self;
    metadata._links = { ...metadata._links, self };
  }
  return metadata;
};

export let transcriptionOutput = (value: z.output<typeof transcriptionSchema>) => ({
  transcriptionId: value.id,
  name: value.name,
  state: value.state,
  language: value.language,
  audioLengthInSeconds: value.audioLengthInSeconds,
  costInCents: value.costInCents,
  sharingEnabled: value.sharingEnabled ?? undefined,
  tags: value.tags,
  createdAt: value.createdAt ?? value.created_at ?? undefined,
  updatedAt: value.updatedAt ?? value.updated_at ?? undefined,
  raw: transcriptionMetadata(value)
});

export let exportSchema = z.looseObject({
  id: z.string(),
  state: z.string(),
  format: z.string(),
  download_link: z.string().nullish(),
  transcription_ids: z.array(z.string()).optional()
});

export let collection = (value: unknown, key: string): unknown[] => {
  if (Array.isArray(value)) return value;
  let data = parseResponse(rawSchema, value);
  return parseResponse(z.array(z.unknown()), data[key] ?? data.results);
};

export let glossarySchema = z.looseObject({
  id: idSchema,
  name: z.string(),
  source_language: z.string().nullish(),
  target_languages: z.array(z.string()).nullish(),
  organization_default: z.boolean().nullish(),
  created_at: z.string().nullish(),
  updated_at: z.string().nullish()
});

export let styleGuideSchema = z.looseObject({
  id: idSchema,
  name: z.string(),
  operation: z.string().nullish(),
  organization_default: z.boolean().nullish(),
  verbatim: z.boolean().nullish(),
  fix_grammar: z.boolean().nullish(),
  sdh: z.boolean().nullish(),
  speaker_id: z.string().nullish(),
  notation_tags: z.unknown().optional(),
  created_at: z.string().nullish(),
  updated_at: z.string().nullish()
});

export let organizationId = (input: string | undefined, configured: string | undefined) => {
  let id = input || configured;
  if (!id) {
    throw createApiServiceError(
      'Organization ID is required. Call list_organizations and provide an ID, or use the saved organization setting.'
    );
  }
  return id;
};

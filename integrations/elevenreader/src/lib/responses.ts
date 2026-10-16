import { createApiServiceError } from 'slates';
import { z } from 'zod';

let text = z.string().nullish();
let number = z.number().nullish();
let boolean = z.boolean().nullish();

export let voiceResponse = z.looseObject({
  voice_id: z.string(),
  // Existing public tools require a name. Do not invent one if the API omits it.
  name: z.string(),
  category: text,
  description: text,
  preview_url: text,
  labels: z.record(z.string(), z.string()).nullish(),
  settings: z
    .looseObject({
      stability: number,
      similarity_boost: number,
      style: number,
      use_speaker_boost: boolean,
      speed: number
    })
    .nullish(),
  fine_tuning: z
    .looseObject({
      is_allowed_to_fine_tune: boolean,
      state: z.record(z.string(), z.string()).nullish()
    })
    .nullish(),
  created_at_unix: number
});

export let voicesResponse = z.looseObject({
  voices: z.array(voiceResponse),
  has_more: z.boolean(),
  total_count: number,
  next_page_token: text
});

export let modelsResponse = z.array(
  z.looseObject({
    model_id: z.string(),
    name: z.string(),
    description: text,
    can_do_text_to_speech: boolean,
    can_do_voice_conversion: boolean,
    can_be_finetuned: boolean,
    can_use_style: boolean,
    can_use_speaker_boost: boolean,
    token_cost_factor: number,
    languages: z.array(z.looseObject({ language_id: z.string(), name: z.string() })).nullish()
  })
);

export let historyItemResponse = z.looseObject({
  history_item_id: z.string(),
  date_unix: z.number(),
  voice_id: text,
  voice_name: text,
  voice_category: text,
  model_id: text,
  text,
  character_count_change_from: number,
  character_count_change_to: number,
  content_type: text,
  source: text
});

export let historyResponse = z.looseObject({
  history: z.array(historyItemResponse),
  has_more: z.boolean(),
  last_history_item_id: text
});

export let dubbingResponse = z.looseObject({
  dubbing_id: z.string(),
  name: text,
  status: z.string(),
  target_languages: z.array(z.string()).nullish(),
  source_language: text,
  created_at: text,
  error: text
});

export let createDubbingResponse = z.looseObject({
  dubbing_id: z.string(),
  expected_duration_sec: z.number()
});

export let userResponse = z.looseObject({
  user_id: z.string(),
  workspace_id: text,
  first_name: text,
  subscription: z
    .looseObject({
      tier: text,
      status: text,
      character_count: number,
      character_limit: number,
      voice_limit: number,
      professional_voice_limit: number,
      can_extend_character_limit: boolean,
      can_use_instant_voice_cloning: boolean,
      can_use_professional_voice_cloning: boolean
    })
    .nullish()
});

export let dictionariesResponse = z.looseObject({
  pronunciation_dictionaries: z.array(
    z.looseObject({
      id: z.string(),
      name: z.string(),
      description: text,
      latest_version_id: text,
      latest_version_rules_num: number,
      created_by: text,
      creation_time_unix: number
    })
  ),
  has_more: z.boolean(),
  next_cursor: text
});

export let transcriptionResponse = z.looseObject({
  text: z.string(),
  language_code: text,
  language_probability: number,
  words: z
    .array(
      z.looseObject({
        text: z.string(),
        start: number,
        end: number,
        speaker_id: text,
        type: text
      })
    )
    .nullish()
});

export let voiceDesignResponse = z.looseObject({
  previews: z.array(
    z.looseObject({
      generated_voice_id: z.string(),
      audio_base_64: z.string(),
      media_type: z.string(),
      duration_secs: z.number()
    })
  ),
  text: z.string().optional()
});

export let createdVoiceResponse = z.looseObject({
  voice_id: z.string(),
  name: text,
  category: text
});

export let statusResponse = z.looseObject({ status: z.literal('ok') });

export let parseProviderResponse = <T extends z.ZodType>(
  schema: T,
  data: unknown,
  operation: string
): z.output<T> => {
  let result = schema.safeParse(data);
  if (!result.success) {
    let paths = result.error.issues.map(issue => issue.path.join('.')).join(', ');
    throw createApiServiceError(
      `ElevenLabs returned an incompatible ${operation} response (${paths}). Required response fields are missing or have unexpected types.`,
      { reason: 'invalid_provider_response' }
    );
  }
  return result.data;
};

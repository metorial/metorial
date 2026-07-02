import { Buffer } from 'node:buffer';
import { createAxios } from 'slates';
import { elevenLabsApiError, elevenLabsServiceError } from './errors';

export type AudioResult = {
  contentBase64: string;
  contentType: string;
  byteLength: number;
};

type VoiceSettings = {
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
  speed?: number;
};

type PronunciationDictionaryLocator = {
  pronunciationDictionaryId: string;
  versionId: string;
};

let appendFormField = (formData: FormData, name: string, value: unknown) => {
  if (value === undefined || value === null) {
    return;
  }

  if (Array.isArray(value) || typeof value === 'object') {
    formData.append(name, JSON.stringify(value));
    return;
  }

  formData.append(name, String(value));
};

let responseDataToBuffer = (data: unknown) => {
  if (Buffer.isBuffer(data)) {
    return data;
  }

  if (data instanceof ArrayBuffer) {
    return Buffer.from(data);
  }

  if (ArrayBuffer.isView(data)) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  }

  if (typeof data === 'string') {
    return Buffer.from(data, 'binary');
  }

  throw elevenLabsServiceError('ElevenLabs returned file content in an unsupported format.');
};

let responseHeader = (headers: unknown, name: string) => {
  if (!headers || typeof headers !== 'object') {
    return undefined;
  }

  let record = headers as Record<string, unknown> & {
    get?: (key: string) => unknown;
  };
  let value = record[name] ?? record[name.toLowerCase()] ?? record.get?.(name);

  return typeof value === 'string' ? value : undefined;
};

let responseToAudio = (
  response: { data: unknown; headers?: unknown },
  fallbackType: string
) => {
  let content = responseDataToBuffer(response.data);
  return {
    contentBase64: content.toString('base64'),
    contentType: responseHeader(response.headers, 'content-type') ?? fallbackType,
    byteLength: content.byteLength
  };
};

let decodeBase64File = (label: string, contentBase64: string) => {
  let normalized = contentBase64.replace(/\s+/g, '');
  let buffer = Buffer.from(normalized, 'base64');
  let encoded = buffer.toString('base64').replace(/=+$/u, '');
  let input = normalized.replace(/=+$/u, '');

  if (!normalized || encoded !== input) {
    throw elevenLabsServiceError(`${label} must be valid non-empty base64 data.`);
  }

  return buffer;
};

let appendBase64File = (params: {
  formData: FormData;
  fieldName: string;
  contentBase64: string;
  fileName?: string;
  contentType?: string;
}) => {
  let fileBytes = decodeBase64File(params.fieldName, params.contentBase64);
  let blob = new Blob([fileBytes], {
    type: params.contentType ?? 'application/octet-stream'
  });

  params.formData.append(params.fieldName, blob, params.fileName ?? 'audio');
};

let mapVoiceSettings = (settings?: VoiceSettings) => {
  if (!settings) {
    return undefined;
  }

  let body: Record<string, unknown> = {};
  if (settings.stability !== undefined) body.stability = settings.stability;
  if (settings.similarityBoost !== undefined) {
    body.similarity_boost = settings.similarityBoost;
  }
  if (settings.style !== undefined) body.style = settings.style;
  if (settings.useSpeakerBoost !== undefined) {
    body.use_speaker_boost = settings.useSpeakerBoost;
  }
  if (settings.speed !== undefined) body.speed = settings.speed;

  return body;
};

let mapPronunciationLocators = (locators?: PronunciationDictionaryLocator[]) =>
  locators?.map(locator => ({
    pronunciation_dictionary_id: locator.pronunciationDictionaryId,
    version_id: locator.versionId
  }));

export class ElevenLabsClient {
  private axios;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: 'https://api.elevenlabs.io',
      headers: {
        'xi-api-key': token
      }
    });
  }

  private async request<T>(operation: string, run: () => Promise<T>) {
    try {
      return await run();
    } catch (error) {
      throw elevenLabsApiError(error, operation);
    }
  }

  async getUser() {
    return this.request('get user', async () => {
      let response = await this.axios.get('/v1/user');
      return response.data;
    });
  }

  async getSubscription() {
    return this.request('get subscription', async () => {
      let response = await this.axios.get('/v1/user/subscription');
      return response.data;
    });
  }

  async listModels() {
    return this.request('list models', async () => {
      let response = await this.axios.get('/v1/models');
      return response.data;
    });
  }

  async listVoices(params?: {
    search?: string;
    voiceType?: string;
    category?: string;
    fineTuningState?: string;
    collectionId?: string;
    includeTotalCount?: boolean;
    voiceIds?: string[];
    pageSize?: number;
    nextPageToken?: string;
    sort?: string;
    sortDirection?: string;
  }) {
    let query: Record<string, string | number | boolean | string[]> = {};
    if (params?.search) query.search = params.search;
    if (params?.voiceType) query.voice_type = params.voiceType;
    if (params?.category) query.category = params.category;
    if (params?.fineTuningState) query.fine_tuning_state = params.fineTuningState;
    if (params?.collectionId) query.collection_id = params.collectionId;
    if (params?.includeTotalCount !== undefined) {
      query.include_total_count = params.includeTotalCount;
    }
    if (params?.voiceIds?.length) query.voice_ids = params.voiceIds;
    if (params?.pageSize) query.page_size = params.pageSize;
    if (params?.nextPageToken) query.next_page_token = params.nextPageToken;
    if (params?.sort) query.sort = params.sort;
    if (params?.sortDirection) query.sort_direction = params.sortDirection;

    return this.request('list voices', async () => {
      let response = await this.axios.get('/v2/voices', { params: query });
      return response.data;
    });
  }

  async getVoice(voiceId: string) {
    return this.request('get voice', async () => {
      let response = await this.axios.get(`/v1/voices/${voiceId}`);
      return response.data;
    });
  }

  async deleteVoice(voiceId: string) {
    return this.request('delete voice', async () => {
      let response = await this.axios.delete(`/v1/voices/${voiceId}`);
      return response.data;
    });
  }

  async getVoiceSettings(voiceId: string) {
    return this.request('get voice settings', async () => {
      let response = await this.axios.get(`/v1/voices/${voiceId}/settings`);
      return response.data;
    });
  }

  async editVoiceSettings(voiceId: string, settings: VoiceSettings) {
    return this.request('edit voice settings', async () => {
      let response = await this.axios.patch(
        `/v1/voices/${voiceId}/settings`,
        mapVoiceSettings(settings) ?? {}
      );
      return response.data;
    });
  }

  async textToSpeech(
    voiceId: string,
    params: {
      text: string;
      modelId?: string;
      languageCode?: string;
      outputFormat?: string;
      voiceSettings?: VoiceSettings;
      pronunciationDictionaryLocators?: PronunciationDictionaryLocator[];
      seed?: number;
      previousText?: string;
      nextText?: string;
      applyTextNormalization?: string;
    }
  ): Promise<AudioResult> {
    let body: Record<string, unknown> = {
      text: params.text
    };
    if (params.modelId) body.model_id = params.modelId;
    if (params.languageCode) body.language_code = params.languageCode;
    if (params.seed !== undefined) body.seed = params.seed;
    if (params.previousText) body.previous_text = params.previousText;
    if (params.nextText) body.next_text = params.nextText;
    if (params.applyTextNormalization) {
      body.apply_text_normalization = params.applyTextNormalization;
    }
    if (params.pronunciationDictionaryLocators) {
      body.pronunciation_dictionary_locators = mapPronunciationLocators(
        params.pronunciationDictionaryLocators
      );
    }
    let voiceSettings = mapVoiceSettings(params.voiceSettings);
    if (voiceSettings) body.voice_settings = voiceSettings;

    let query: Record<string, string> = {};
    if (params.outputFormat) query.output_format = params.outputFormat;

    return this.request('create speech', async () => {
      let response = await this.axios.post(`/v1/text-to-speech/${voiceId}`, body, {
        params: query,
        responseType: 'arraybuffer'
      });

      return responseToAudio(response, 'audio/mpeg');
    });
  }

  async createDialogue(params: {
    inputs: Array<{ text: string; voiceId: string }>;
    modelId?: string;
    languageCode?: string;
    outputFormat?: string;
    settings?: VoiceSettings;
  }): Promise<AudioResult> {
    let body: Record<string, unknown> = {
      inputs: params.inputs.map(input => ({
        text: input.text,
        voice_id: input.voiceId
      }))
    };
    if (params.modelId) body.model_id = params.modelId;
    if (params.languageCode) body.language_code = params.languageCode;
    let settings = mapVoiceSettings(params.settings);
    if (settings) body.settings = settings;

    let query: Record<string, string> = {};
    if (params.outputFormat) query.output_format = params.outputFormat;

    return this.request('create dialogue', async () => {
      let response = await this.axios.post('/v1/text-to-dialogue', body, {
        params: query,
        responseType: 'arraybuffer'
      });

      return responseToAudio(response, 'audio/mpeg');
    });
  }

  async voiceChanger(
    voiceId: string,
    params: {
      fileBase64: string;
      fileName?: string;
      modelId?: string;
      outputFormat?: string;
      voiceSettings?: VoiceSettings;
      seed?: number;
      removeBackgroundNoise?: boolean;
      fileFormat?: 'pcm_s16le_16' | 'other';
    }
  ): Promise<AudioResult> {
    let formData = new FormData();
    appendBase64File({
      formData,
      fieldName: 'audio',
      contentBase64: params.fileBase64,
      fileName: params.fileName
    });
    appendFormField(formData, 'model_id', params.modelId);
    appendFormField(formData, 'seed', params.seed);
    appendFormField(formData, 'remove_background_noise', params.removeBackgroundNoise);
    appendFormField(formData, 'file_format', params.fileFormat);
    let voiceSettings = mapVoiceSettings(params.voiceSettings);
    if (voiceSettings) appendFormField(formData, 'voice_settings', voiceSettings);

    let query: Record<string, string> = {};
    if (params.outputFormat) query.output_format = params.outputFormat;

    return this.request('voice changer', async () => {
      let response = await this.axios.post(`/v1/speech-to-speech/${voiceId}`, formData, {
        params: query,
        responseType: 'arraybuffer'
      });

      return responseToAudio(response, 'audio/mpeg');
    });
  }

  async speechToText(params: {
    modelId: string;
    fileBase64?: string;
    fileName?: string;
    sourceUrl?: string;
    cloudStorageUrl?: string;
    languageCode?: string;
    diarize?: boolean;
    numSpeakers?: number;
    timestampsGranularity?: string;
    tagAudioEvents?: boolean;
    diarizationThreshold?: number;
    fileFormat?: 'pcm_s16le_16' | 'other';
    temperature?: number;
    seed?: number;
    useMultiChannel?: boolean;
  }) {
    let formData = new FormData();
    appendFormField(formData, 'model_id', params.modelId);
    appendFormField(formData, 'language_code', params.languageCode);
    appendFormField(formData, 'diarize', params.diarize);
    appendFormField(formData, 'num_speakers', params.numSpeakers);
    appendFormField(formData, 'timestamps_granularity', params.timestampsGranularity);
    appendFormField(formData, 'tag_audio_events', params.tagAudioEvents);
    appendFormField(formData, 'diarization_threshold', params.diarizationThreshold);
    appendFormField(formData, 'file_format', params.fileFormat);
    appendFormField(formData, 'temperature', params.temperature);
    appendFormField(formData, 'seed', params.seed);
    appendFormField(formData, 'use_multi_channel', params.useMultiChannel);

    if (params.sourceUrl) {
      appendFormField(formData, 'source_url', params.sourceUrl);
    } else if (params.cloudStorageUrl) {
      appendFormField(formData, 'cloud_storage_url', params.cloudStorageUrl);
    } else if (params.fileBase64) {
      appendBase64File({
        formData,
        fieldName: 'file',
        contentBase64: params.fileBase64,
        fileName: params.fileName
      });
    }

    return this.request('create transcript', async () => {
      let response = await this.axios.post('/v1/speech-to-text', formData);
      return response.data;
    });
  }

  async generateSoundEffect(params: {
    text: string;
    durationSeconds?: number;
    loop?: boolean;
    promptInfluence?: number;
    modelId?: string;
    outputFormat?: string;
  }): Promise<AudioResult> {
    let body: Record<string, unknown> = {
      text: params.text
    };
    if (params.durationSeconds !== undefined) {
      body.duration_seconds = params.durationSeconds;
    }
    if (params.loop !== undefined) body.loop = params.loop;
    if (params.promptInfluence !== undefined) body.prompt_influence = params.promptInfluence;
    if (params.modelId) body.model_id = params.modelId;

    let query: Record<string, string> = {};
    if (params.outputFormat) query.output_format = params.outputFormat;

    return this.request('create sound effect', async () => {
      let response = await this.axios.post('/v1/sound-generation', body, {
        params: query,
        responseType: 'arraybuffer'
      });

      return responseToAudio(response, 'audio/mpeg');
    });
  }

  async composeMusic(params: {
    prompt: string;
    musicLengthMs?: number;
    modelId?: string;
    forceInstrumental?: boolean;
    outputFormat?: string;
  }): Promise<AudioResult> {
    let body: Record<string, unknown> = {
      prompt: params.prompt
    };
    if (params.musicLengthMs !== undefined) body.music_length_ms = params.musicLengthMs;
    if (params.modelId) body.model_id = params.modelId;
    if (params.forceInstrumental !== undefined) {
      body.force_instrumental = params.forceInstrumental;
    }

    let query: Record<string, string> = {};
    if (params.outputFormat) query.output_format = params.outputFormat;

    return this.request('compose music', async () => {
      let response = await this.axios.post('/v1/music', body, {
        params: query,
        responseType: 'arraybuffer',
        timeout: 300000
      });

      return responseToAudio(response, 'audio/mpeg');
    });
  }

  async createDubbing(params: {
    sourceUrl: string;
    sourceLang?: string;
    targetLang: string;
    targetAccent?: string;
    numSpeakers?: number;
    watermark?: boolean;
    name?: string;
    startTime?: number;
    endTime?: number;
    highestResolution?: boolean;
  }) {
    let formData = new FormData();
    appendFormField(formData, 'source_url', params.sourceUrl);
    appendFormField(formData, 'source_lang', params.sourceLang);
    appendFormField(formData, 'target_lang', params.targetLang);
    appendFormField(formData, 'target_accent', params.targetAccent);
    appendFormField(formData, 'num_speakers', params.numSpeakers);
    appendFormField(formData, 'watermark', params.watermark);
    appendFormField(formData, 'name', params.name);
    appendFormField(formData, 'start_time', params.startTime);
    appendFormField(formData, 'end_time', params.endTime);
    appendFormField(formData, 'highest_resolution', params.highestResolution);
    appendFormField(formData, 'mode', 'automatic');

    return this.request('create dubbing', async () => {
      let response = await this.axios.post('/v1/dubbing', formData);
      return response.data;
    });
  }

  async getDubbing(dubbingId: string) {
    return this.request('get dubbing', async () => {
      let response = await this.axios.get(`/v1/dubbing/${dubbingId}`);
      return response.data;
    });
  }

  async deleteDubbing(dubbingId: string) {
    return this.request('delete dubbing', async () => {
      let response = await this.axios.delete(`/v1/dubbing/${dubbingId}`);
      return response.data;
    });
  }

  async isolateAudio(params: {
    fileBase64: string;
    fileName?: string;
    fileFormat?: 'pcm_s16le_16' | 'other';
    previewBase64?: string;
  }): Promise<AudioResult> {
    let formData = new FormData();
    appendBase64File({
      formData,
      fieldName: 'audio',
      contentBase64: params.fileBase64,
      fileName: params.fileName
    });
    appendFormField(formData, 'file_format', params.fileFormat);
    appendFormField(formData, 'preview_b64', params.previewBase64);

    return this.request('audio isolation', async () => {
      let response = await this.axios.post('/v1/audio-isolation', formData, {
        responseType: 'arraybuffer'
      });

      return responseToAudio(response, 'audio/mpeg');
    });
  }

  async createForcedAlignment(params: {
    fileBase64: string;
    fileName?: string;
    text: string;
  }) {
    let formData = new FormData();
    appendBase64File({
      formData,
      fieldName: 'file',
      contentBase64: params.fileBase64,
      fileName: params.fileName
    });
    appendFormField(formData, 'text', params.text);

    return this.request('create forced alignment', async () => {
      let response = await this.axios.post('/v1/forced-alignment', formData);
      return response.data;
    });
  }

  async listHistory(params?: { pageSize?: number; startAfterHistoryItemId?: string }) {
    let query: Record<string, string | number> = {};
    if (params?.pageSize) query.page_size = params.pageSize;
    if (params?.startAfterHistoryItemId) {
      query.start_after_history_item_id = params.startAfterHistoryItemId;
    }

    return this.request('list history', async () => {
      let response = await this.axios.get('/v1/history', { params: query });
      return response.data;
    });
  }

  async getHistoryItem(historyItemId: string) {
    return this.request('get history item', async () => {
      let response = await this.axios.get(`/v1/history/${historyItemId}`);
      return response.data;
    });
  }

  async getHistoryAudio(historyItemId: string): Promise<AudioResult> {
    return this.request('get history audio', async () => {
      let response = await this.axios.get(`/v1/history/${historyItemId}/audio`, {
        responseType: 'arraybuffer'
      });

      return responseToAudio(response, 'audio/mpeg');
    });
  }

  async createWebhook(params: { name: string; webhookUrl: string }) {
    return this.request('create webhook', async () => {
      let response = await this.axios.post('/v1/workspace/webhooks', {
        settings: {
          auth_type: 'hmac',
          name: params.name,
          webhook_url: params.webhookUrl
        }
      });
      return response.data;
    });
  }

  async listWebhooks() {
    return this.request('list webhooks', async () => {
      let response = await this.axios.get('/v1/workspace/webhooks', {
        params: { include_usages: true }
      });
      return response.data;
    });
  }

  async deleteWebhook(webhookId: string) {
    return this.request('delete webhook', async () => {
      let response = await this.axios.delete(`/v1/workspace/webhooks/${webhookId}`);
      return response.data;
    });
  }
}

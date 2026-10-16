import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getResponseHeaderValue,
  isApiErrorRecord
} from 'slates';
import {
  createDubbingResponse,
  createdVoiceResponse,
  dictionariesResponse,
  dubbingResponse,
  historyItemResponse,
  historyResponse,
  modelsResponse,
  parseProviderResponse,
  statusResponse,
  transcriptionResponse,
  userResponse,
  voiceResponse,
  voicesResponse
} from './responses';

export class ElevenLabsClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(token: string) {
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.elevenlabs.io',
      authHeader: { name: 'xi-api-key', value: token },
      contentType: false,
      errorMapping: {
        extractResponseData: response => {
          let data: unknown = response.data;
          if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
            let body =
              data instanceof ArrayBuffer
                ? Buffer.from(data)
                : Buffer.from(data.buffer, data.byteOffset, data.byteLength);
            try {
              return JSON.parse(body.toString('utf8'));
            } catch {
              return body.toString('utf8');
            }
          }
          return data;
        }
      },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'ElevenLabs',
          reason: 'elevenlabs_api_error',
          detailKeys: ['message', 'detail', 'status', 'code'],
          nestedKeys: ['detail', 'errors'],
          extractResponse: (input, helpers) => helpers.getResponseWithBody(input),
          extractUpstreamCode: (_input, response) => {
            let data = response?.data;
            if (!isApiErrorRecord(data)) return undefined;
            let detail = isApiErrorRecord(data.detail) ? data.detail : data;
            return typeof detail.status === 'string'
              ? detail.status
              : typeof detail.code === 'string'
                ? detail.code
                : undefined;
          }
        })
    });
  }

  // ── Models ──

  async listModels() {
    let response = await this.axios.get('/v1/models');
    return {
      models: parseProviderResponse(modelsResponse, response.data, 'models'),
      raw: response.data
    };
  }

  // ── Voices ──

  async searchVoices(params: {
    search?: string;
    pageSize?: number;
    nextPageToken?: string;
    sort?: string;
    sortDirection?: string;
    voiceType?: string;
    category?: string;
    includeTotalCount?: boolean;
  }) {
    let response = await this.axios.get('/v2/voices', {
      params: {
        search: params.search,
        page_size: params.pageSize,
        next_page_token: params.nextPageToken,
        sort: params.sort,
        sort_direction: params.sortDirection,
        voice_type: params.voiceType,
        category: params.category,
        include_total_count: params.includeTotalCount
      }
    });
    return {
      ...parseProviderResponse(voicesResponse, response.data, 'searchVoices'),
      raw: response.data
    };
  }

  async getVoice(voiceId: string) {
    let response = await this.axios.get(`/v1/voices/${encodeURIComponent(voiceId)}`);
    return {
      ...parseProviderResponse(voiceResponse, response.data, 'getVoice'),
      raw: response.data
    };
  }

  async editVoice(
    voiceId: string,
    params: {
      name: string;
      description?: string;
      labels?: Record<string, string>;
    }
  ) {
    let form = new FormData();
    form.append('name', params.name);
    if (params.description !== undefined) form.append('description', params.description);
    if (params.labels !== undefined) form.append('labels', JSON.stringify(params.labels));
    let response = await this.axios.post(
      `/v1/voices/${encodeURIComponent(voiceId)}/edit`,
      form
    );
    return {
      ...parseProviderResponse(statusResponse, response.data, 'voice update'),
      raw: response.data
    };
  }

  async deleteVoice(voiceId: string) {
    let response = await this.axios.delete(`/v1/voices/${encodeURIComponent(voiceId)}`);
    return {
      ...parseProviderResponse(statusResponse, response.data, 'voice deletion'),
      raw: response.data
    };
  }

  // ── Text to Speech ──

  async textToSpeech(
    voiceId: string,
    params: {
      text: string;
      modelId?: string;
      languageCode?: string;
      voiceSettings?: {
        stability?: number;
        similarityBoost?: number;
        style?: number;
        useSpeakerBoost?: boolean;
        speed?: number;
      };
      outputFormat?: string;
      seed?: number;
      previousText?: string;
      nextText?: string;
      applyTextNormalization?: string;
    },
    requireContentType = false
  ): Promise<{ audioBase64: string; contentType: string }> {
    let voiceSettings = params.voiceSettings
      ? {
          stability: params.voiceSettings.stability,
          similarity_boost: params.voiceSettings.similarityBoost,
          style: params.voiceSettings.style,
          use_speaker_boost: params.voiceSettings.useSpeakerBoost,
          speed: params.voiceSettings.speed
        }
      : undefined;

    let response = await this.axios.post(
      `/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
      {
        text: params.text,
        model_id: params.modelId || 'eleven_multilingual_v2',
        language_code: params.languageCode,
        voice_settings: voiceSettings,
        seed: params.seed,
        previous_text: params.previousText,
        next_text: params.nextText,
        apply_text_normalization: params.applyTextNormalization
      },
      {
        params: {
          output_format: params.outputFormat || 'mp3_44100_128'
        },
        responseType: 'arraybuffer'
      }
    );

    let buffer = Buffer.from(response.data);
    let audioBase64 = buffer.toString('base64');
    let responseContentType = getResponseHeaderValue(response.headers, 'content-type');
    if (requireContentType && !responseContentType) {
      throw createApiServiceError(
        'ElevenLabs did not return the audio MIME type. Retry the generation.'
      );
    }
    let contentType = responseContentType ?? 'audio/mpeg';

    return { audioBase64, contentType };
  }

  // ── Speech to Text ──

  async speechToText(params: {
    audioBase64?: string;
    cloudStorageUrl?: string;
    modelId?: string;
    languageCode?: string;
    diarize?: boolean;
    timestampsGranularity?: string;
    tagAudioEvents?: boolean;
    fileName?: string;
  }) {
    if (Boolean(params.audioBase64) === Boolean(params.cloudStorageUrl)) {
      throw createApiServiceError('Provide exactly one of audioBase64 or cloudStorageUrl.');
    }
    let formData = new FormData();

    formData.append('model_id', params.modelId || 'scribe_v2');

    if (params.audioBase64) {
      let buffer = Buffer.from(params.audioBase64, 'base64');
      let blob = new Blob([buffer]);
      formData.append('file', blob, params.fileName || 'audio.mp3');
    }

    if (params.cloudStorageUrl) {
      formData.append('cloud_storage_url', params.cloudStorageUrl);
    }

    if (params.languageCode) {
      formData.append('language_code', params.languageCode);
    }

    if (params.diarize !== undefined) {
      formData.append('diarize', String(params.diarize));
    }

    if (params.timestampsGranularity) {
      formData.append('timestamps_granularity', params.timestampsGranularity);
    }

    if (params.tagAudioEvents !== undefined) {
      formData.append('tag_audio_events', String(params.tagAudioEvents));
    }

    let response = await this.axios.post('/v1/speech-to-text', formData);

    return {
      ...parseProviderResponse(transcriptionResponse, response.data, 'speechToText'),
      raw: response.data
    };
  }

  // ── Sound Effects ──

  async generateSoundEffect(
    params: {
      text: string;
      durationSeconds?: number;
      promptInfluence?: number;
      loop?: boolean;
      outputFormat?: string;
    },
    requireContentType = false
  ): Promise<{ audioBase64: string; contentType: string }> {
    let response = await this.axios.post(
      '/v1/sound-generation',
      {
        text: params.text,
        duration_seconds: params.durationSeconds,
        prompt_influence: params.promptInfluence,
        loop: params.loop
      },
      {
        params: {
          output_format: params.outputFormat || 'mp3_44100_128'
        },
        responseType: 'arraybuffer'
      }
    );

    let buffer = Buffer.from(response.data);
    let audioBase64 = buffer.toString('base64');
    let responseContentType = getResponseHeaderValue(response.headers, 'content-type');
    if (requireContentType && !responseContentType) {
      throw createApiServiceError(
        'ElevenLabs did not return the audio MIME type. Retry the generation.'
      );
    }
    let contentType = responseContentType ?? 'audio/mpeg';

    return { audioBase64, contentType };
  }

  // ── Dubbing ──

  async createDubbing(params: {
    sourceUrl?: string;
    sourceLang?: string;
    targetLang: string;
    name?: string;
    numSpeakers?: number;
    watermark?: boolean;
    dropBackgroundAudio?: boolean;
    disableVoiceCloning?: boolean;
    highestResolution?: boolean;
  }) {
    let formData = new FormData();

    if (params.sourceUrl) {
      formData.append('source_url', params.sourceUrl);
    }

    formData.append('target_lang', params.targetLang);

    if (params.sourceLang) {
      formData.append('source_lang', params.sourceLang);
    }

    if (params.name) {
      formData.append('name', params.name);
    }

    if (params.numSpeakers !== undefined) {
      formData.append('num_speakers', String(params.numSpeakers));
    }

    if (params.watermark !== undefined) {
      formData.append('watermark', String(params.watermark));
    }

    if (params.dropBackgroundAudio !== undefined) {
      formData.append('drop_background_audio', String(params.dropBackgroundAudio));
    }

    if (params.disableVoiceCloning !== undefined) {
      formData.append('disable_voice_cloning', String(params.disableVoiceCloning));
    }

    if (params.highestResolution !== undefined) {
      formData.append('highest_resolution', String(params.highestResolution));
    }

    let response = await this.axios.post('/v1/dubbing', formData);
    let result = parseProviderResponse(
      createDubbingResponse,
      response.data,
      'dubbing creation'
    );
    return {
      dubbingId: result.dubbing_id,
      expectedDurationSec: result.expected_duration_sec,
      raw: response.data
    };
  }

  async getDubbing(dubbingId: string) {
    let response = await this.axios.get(`/v1/dubbing/${encodeURIComponent(dubbingId)}`);
    return {
      ...parseProviderResponse(dubbingResponse, response.data, 'getDubbing'),
      raw: response.data
    };
  }

  async deleteDubbing(dubbingId: string) {
    let response = await this.axios.delete(`/v1/dubbing/${encodeURIComponent(dubbingId)}`);
    return parseProviderResponse(statusResponse, response.data, 'dubbing deletion');
  }

  // ── Audio Isolation ──

  async isolateAudio(
    params: {
      audioBase64: string;
      fileName?: string;
    },
    requireContentType = false
  ): Promise<{ audioBase64: string; contentType: string }> {
    let formData = new FormData();

    let buffer = Buffer.from(params.audioBase64, 'base64');
    let blob = new Blob([buffer]);
    formData.append('audio', blob, params.fileName || 'audio.mp3');

    let response = await this.axios.post('/v1/audio-isolation', formData, {
      responseType: 'arraybuffer'
    });

    let resultBuffer = Buffer.from(response.data);
    let audioBase64 = resultBuffer.toString('base64');
    let responseContentType = getResponseHeaderValue(response.headers, 'content-type');
    if (requireContentType && !responseContentType) {
      throw createApiServiceError(
        'ElevenLabs did not return the audio MIME type. Retry the generation.'
      );
    }
    let contentType = responseContentType ?? 'audio/mpeg';

    return { audioBase64, contentType };
  }

  // ── Voice Design ──

  async designVoice(params: {
    voiceDescription: string;
    text?: string;
    modelId?: string;
    autoGenerateText?: boolean;
  }): Promise<any> {
    let response = await this.axios.post('/v1/text-to-voice/design', {
      voice_description: params.voiceDescription,
      text: params.text,
      model_id: params.modelId,
      auto_generate_text: params.autoGenerateText
    });

    return response.data;
  }

  async createVoiceFromPreview(params: {
    voiceName: string;
    voiceDescription: string;
    generatedVoiceId: string;
    labels?: Record<string, string>;
  }) {
    let response = await this.axios.post('/v1/text-to-voice', {
      voice_name: params.voiceName,
      voice_description: params.voiceDescription,
      generated_voice_id: params.generatedVoiceId,
      labels: params.labels
    });
    return {
      ...parseProviderResponse(createdVoiceResponse, response.data, 'voice creation'),
      raw: response.data
    };
  }

  // ── History ──

  async listHistory(params?: {
    pageSize?: number;
    startAfterHistoryItemId?: string;
    voiceId?: string;
    search?: string;
  }) {
    let response = await this.axios.get('/v1/history', {
      params: {
        page_size: params?.pageSize || 20,
        start_after_history_item_id: params?.startAfterHistoryItemId,
        voice_id: params?.voiceId,
        search: params?.search
      }
    });
    return {
      ...parseProviderResponse(historyResponse, response.data, 'listHistory'),
      raw: response.data
    };
  }

  async getHistoryItem(historyItemId: string) {
    let response = await this.axios.get(`/v1/history/${encodeURIComponent(historyItemId)}`);
    return {
      ...parseProviderResponse(historyItemResponse, response.data, 'getHistoryItem'),
      raw: response.data
    };
  }

  // ── Pronunciation Dictionaries ──

  async listPronunciationDictionaries(params?: { pageSize?: number; cursor?: string }) {
    let response = await this.axios.get('/v1/pronunciation-dictionaries', {
      params: {
        page_size: params?.pageSize || 30,
        cursor: params?.cursor
      }
    });
    return {
      ...parseProviderResponse(
        dictionariesResponse,
        response.data,
        'listPronunciationDictionaries'
      ),
      raw: response.data
    };
  }

  // ── User ──

  async getUser() {
    let response = await this.axios.get('/v1/user');
    return {
      ...parseProviderResponse(userResponse, response.data, 'getUser'),
      raw: response.data
    };
  }
}

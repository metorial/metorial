import { createAxios } from 'slates';

export class ElevenLabsClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: 'https://api.elevenlabs.io',
      headers: {
        'xi-api-key': token
      }
    });
  }

  // ── Models ──

  async listModels(): Promise<any[]> {
    let response = await this.axios.get('/v1/models');
    return response.data;
  }

  // ── Voices ──

  async listVoices(): Promise<any> {
    let response = await this.axios.get('/v1/voices');
    return response.data;
  }

  async searchVoices(params: {
    search?: string;
    pageSize?: number;
    nextPageToken?: string;
    sort?: string;
    sortDirection?: string;
    voiceType?: string;
    category?: string;
    includeTotalCount?: boolean;
  }): Promise<any> {
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
    return response.data;
  }

  async getVoice(voiceId: string): Promise<any> {
    let response = await this.axios.get(`/v1/voices/${voiceId}`);
    return response.data;
  }

  async editVoice(
    voiceId: string,
    params: {
      name: string;
      description?: string;
      labels?: Record<string, string>;
    }
  ): Promise<any> {
    let response = await this.axios.patch(`/v1/voices/${voiceId}`, {
      name: params.name,
      description: params.description,
      labels: params.labels
    });
    return response.data;
  }

  async deleteVoice(voiceId: string): Promise<void> {
    await this.axios.delete(`/v1/voices/${voiceId}`);
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
    }
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
      `/v1/text-to-speech/${voiceId}`,
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
    let contentType = String(response.headers['content-type'] ?? 'audio/mpeg');

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
  }): Promise<any> {
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

    let response = await this.axios.post('/v1/speech-to-text', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data;
  }

  // ── Sound Effects ──

  async generateSoundEffect(params: {
    text: string;
    durationSeconds?: number;
    promptInfluence?: number;
    loop?: boolean;
    outputFormat?: string;
  }): Promise<{ audioBase64: string; contentType: string }> {
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
    let contentType = String(response.headers['content-type'] ?? 'audio/mpeg');

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
  }): Promise<{ dubbingId: string; expectedDurationSec: number }> {
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

    let response = await this.axios.post('/v1/dubbing', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return {
      dubbingId: response.data.dubbing_id,
      expectedDurationSec: response.data.expected_duration_sec
    };
  }

  async getDubbing(dubbingId: string): Promise<any> {
    let response = await this.axios.get(`/v1/dubbing/${dubbingId}`);
    return response.data;
  }

  async deleteDubbing(dubbingId: string): Promise<void> {
    await this.axios.delete(`/v1/dubbing/${dubbingId}`);
  }

  // ── Audio Isolation ──

  async isolateAudio(params: {
    audioBase64: string;
    fileName?: string;
  }): Promise<{ audioBase64: string; contentType: string }> {
    let formData = new FormData();

    let buffer = Buffer.from(params.audioBase64, 'base64');
    let blob = new Blob([buffer]);
    formData.append('audio', blob, params.fileName || 'audio.mp3');

    let response = await this.axios.post('/v1/audio-isolation', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      responseType: 'arraybuffer'
    });

    let resultBuffer = Buffer.from(response.data);
    let audioBase64 = resultBuffer.toString('base64');
    let contentType = String(response.headers['content-type'] ?? 'audio/mpeg');

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

  // ── History ──

  async listHistory(params?: {
    pageSize?: number;
    startAfterHistoryItemId?: string;
    voiceId?: string;
    search?: string;
  }): Promise<any> {
    let response = await this.axios.get('/v1/history', {
      params: {
        page_size: params?.pageSize || 20,
        start_after_history_item_id: params?.startAfterHistoryItemId,
        voice_id: params?.voiceId,
        search: params?.search
      }
    });
    return response.data;
  }

  async getHistoryItem(historyItemId: string): Promise<any> {
    let response = await this.axios.get(`/v1/history/${historyItemId}`);
    return response.data;
  }

  async deleteHistoryItem(historyItemId: string): Promise<void> {
    await this.axios.delete(`/v1/history/${historyItemId}`);
  }

  // ── Pronunciation Dictionaries ──

  async listPronunciationDictionaries(params?: {
    pageSize?: number;
    cursor?: string;
  }): Promise<any> {
    let response = await this.axios.get('/v1/pronunciation-dictionaries', {
      params: {
        page_size: params?.pageSize || 30,
        cursor: params?.cursor
      }
    });
    return response.data;
  }

  // ── User ──

  async getUser(): Promise<any> {
    let response = await this.axios.get('/v1/user');
    return response.data;
  }

  async getUserSubscription(): Promise<any> {
    let response = await this.axios.get('/v1/user/subscription');
    return response.data;
  }
}

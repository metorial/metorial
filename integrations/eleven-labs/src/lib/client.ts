import { createAxios } from 'slates';

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

  // ── User & Account ──

  async getUser() {
    let response = await this.axios.get('/v1/user');
    return response.data;
  }

  async getSubscription() {
    let response = await this.axios.get('/v1/user/subscription');
    return response.data;
  }

  // ── Models ──

  async listModels() {
    let response = await this.axios.get('/v1/models');
    return response.data;
  }

  // ── Voices ──

  async listVoices(params?: {
    search?: string;
    voiceType?: string;
    category?: string;
    pageSize?: number;
    nextPageToken?: string;
    sort?: string;
    sortDirection?: string;
  }) {
    let query: Record<string, string | number> = {};
    if (params?.search) query.search = params.search;
    if (params?.voiceType) query.voice_type = params.voiceType;
    if (params?.category) query.category = params.category;
    if (params?.pageSize) query.page_size = params.pageSize;
    if (params?.nextPageToken) query.next_page_token = params.nextPageToken;
    if (params?.sort) query.sort = params.sort;
    if (params?.sortDirection) query.sort_direction = params.sortDirection;

    let response = await this.axios.get('/v2/voices', { params: query });
    return response.data;
  }

  async getVoice(voiceId: string) {
    let response = await this.axios.get(`/v1/voices/${voiceId}`);
    return response.data;
  }

  async deleteVoice(voiceId: string) {
    let response = await this.axios.delete(`/v1/voices/${voiceId}`);
    return response.data;
  }

  async getVoiceSettings(voiceId: string) {
    let response = await this.axios.get(`/v1/voices/${voiceId}/settings`);
    return response.data;
  }

  async editVoiceSettings(
    voiceId: string,
    settings: {
      stability?: number;
      similarityBoost?: number;
      style?: number;
      useSpeakerBoost?: boolean;
    }
  ) {
    let body: Record<string, unknown> = {};
    if (settings.stability !== undefined) body.stability = settings.stability;
    if (settings.similarityBoost !== undefined)
      body.similarity_boost = settings.similarityBoost;
    if (settings.style !== undefined) body.style = settings.style;
    if (settings.useSpeakerBoost !== undefined)
      body.use_speaker_boost = settings.useSpeakerBoost;

    let response = await this.axios.patch(`/v1/voices/${voiceId}/settings`, body);
    return response.data;
  }

  // ── Text to Speech ──

  async textToSpeech(
    voiceId: string,
    params: {
      text: string;
      modelId?: string;
      languageCode?: string;
      outputFormat?: string;
      voiceSettings?: {
        stability?: number;
        similarityBoost?: number;
        style?: number;
        useSpeakerBoost?: boolean;
        speed?: number;
      };
      pronunciationDictionaryLocators?: Array<{
        pronunciationDictionaryId: string;
        versionId: string;
      }>;
      seed?: number;
      applyTextNormalization?: string;
    }
  ) {
    let body: Record<string, unknown> = {
      text: params.text
    };
    if (params.modelId) body.model_id = params.modelId;
    if (params.languageCode) body.language_code = params.languageCode;
    if (params.seed !== undefined) body.seed = params.seed;
    if (params.applyTextNormalization)
      body.apply_text_normalization = params.applyTextNormalization;
    if (params.pronunciationDictionaryLocators) {
      body.pronunciation_dictionary_locators = params.pronunciationDictionaryLocators.map(
        l => ({
          pronunciation_dictionary_id: l.pronunciationDictionaryId,
          version_id: l.versionId
        })
      );
    }
    if (params.voiceSettings) {
      let vs: Record<string, unknown> = {};
      if (params.voiceSettings.stability !== undefined)
        vs.stability = params.voiceSettings.stability;
      if (params.voiceSettings.similarityBoost !== undefined)
        vs.similarity_boost = params.voiceSettings.similarityBoost;
      if (params.voiceSettings.style !== undefined) vs.style = params.voiceSettings.style;
      if (params.voiceSettings.useSpeakerBoost !== undefined)
        vs.use_speaker_boost = params.voiceSettings.useSpeakerBoost;
      if (params.voiceSettings.speed !== undefined) vs.speed = params.voiceSettings.speed;
      body.voice_settings = vs;
    }

    let query: Record<string, string> = {};
    if (params.outputFormat) query.output_format = params.outputFormat;

    let response = await this.axios.post(`/v1/text-to-speech/${voiceId}`, body, {
      params: query,
      responseType: 'arraybuffer'
    });

    let audioData = response.data as ArrayBuffer;
    let bytes = new Uint8Array(audioData);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]!);
    }
    let base64Audio = btoa(binary);

    return {
      audioBase64: base64Audio,
      contentType: String(response.headers?.['content-type'] ?? 'audio/mpeg')
    };
  }

  // ── Speech to Text ──

  async speechToText(params: {
    modelId: string;
    fileBase64?: string;
    fileName?: string;
    cloudStorageUrl?: string;
    languageCode?: string;
    diarize?: boolean;
    numSpeakers?: number;
    timestampsGranularity?: string;
    tagAudioEvents?: boolean;
  }) {
    let boundary = `----SlatesBoundary${Date.now().toString(36)}`;
    let parts: string[] = [];

    parts.push(
      `--${boundary}\r\nContent-Disposition: form-data; name="model_id"\r\n\r\n${params.modelId}`
    );

    if (params.cloudStorageUrl) {
      parts.push(
        `--${boundary}\r\nContent-Disposition: form-data; name="cloud_storage_url"\r\n\r\n${params.cloudStorageUrl}`
      );
    }

    if (params.languageCode) {
      parts.push(
        `--${boundary}\r\nContent-Disposition: form-data; name="language_code"\r\n\r\n${params.languageCode}`
      );
    }

    if (params.diarize !== undefined) {
      parts.push(
        `--${boundary}\r\nContent-Disposition: form-data; name="diarize"\r\n\r\n${params.diarize}`
      );
    }

    if (params.numSpeakers !== undefined) {
      parts.push(
        `--${boundary}\r\nContent-Disposition: form-data; name="num_speakers"\r\n\r\n${params.numSpeakers}`
      );
    }

    if (params.timestampsGranularity) {
      parts.push(
        `--${boundary}\r\nContent-Disposition: form-data; name="timestamps_granularity"\r\n\r\n${params.timestampsGranularity}`
      );
    }

    if (params.tagAudioEvents !== undefined) {
      parts.push(
        `--${boundary}\r\nContent-Disposition: form-data; name="tag_audio_events"\r\n\r\n${params.tagAudioEvents}`
      );
    }

    if (params.fileBase64) {
      let binaryStr = atob(params.fileBase64);
      let fileName = params.fileName || 'audio.mp3';
      parts.push(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: application/octet-stream\r\nContent-Transfer-Encoding: binary\r\n\r\n${binaryStr}`
      );
    }

    let bodyStr = `${parts.join('\r\n')}\r\n--${boundary}--`;

    let response = await this.axios.post('/v1/speech-to-text', bodyStr, {
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      }
    });

    return response.data;
  }

  // ── Sound Effects ──

  async generateSoundEffect(params: {
    text: string;
    durationSeconds?: number;
    loop?: boolean;
    outputFormat?: string;
  }) {
    let body: Record<string, unknown> = {
      text: params.text
    };
    if (params.durationSeconds !== undefined) body.duration_seconds = params.durationSeconds;
    if (params.loop !== undefined) body.loop = params.loop;

    let query: Record<string, string> = {};
    if (params.outputFormat) query.output_format = params.outputFormat;

    let response = await this.axios.post('/v1/sound-generation', body, {
      params: query,
      responseType: 'arraybuffer'
    });

    let audioData = response.data as ArrayBuffer;
    let bytes = new Uint8Array(audioData);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]!);
    }
    let base64Audio = btoa(binary);

    return {
      audioBase64: base64Audio,
      contentType: String(response.headers?.['content-type'] ?? 'audio/mpeg')
    };
  }

  // ── Music Generation ──

  async composeMusic(params: {
    prompt?: string;
    musicLengthMs?: number;
    outputFormat?: string;
  }) {
    let body: Record<string, unknown> = {};
    if (params.prompt) body.prompt = params.prompt;
    if (params.musicLengthMs !== undefined) body.music_length_ms = params.musicLengthMs;

    let query: Record<string, string> = {};
    if (params.outputFormat) query.output_format = params.outputFormat;

    let response = await this.axios.post('/v1/music/compose', body, {
      params: query,
      responseType: 'arraybuffer',
      timeout: 300000
    });

    let audioData = response.data as ArrayBuffer;
    let bytes = new Uint8Array(audioData);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]!);
    }
    let base64Audio = btoa(binary);

    return {
      audioBase64: base64Audio,
      contentType: String(response.headers?.['content-type'] ?? 'audio/mpeg')
    };
  }

  // ── Dubbing ──

  async createDubbing(params: {
    sourceUrl?: string;
    sourceLang?: string;
    targetLang: string;
    numSpeakers?: number;
    watermark?: boolean;
    name?: string;
    highestResolution?: boolean;
  }) {
    let boundary = `----SlatesBoundary${Date.now().toString(36)}`;
    let parts: string[] = [];

    if (params.sourceUrl) {
      parts.push(
        `--${boundary}\r\nContent-Disposition: form-data; name="source_url"\r\n\r\n${params.sourceUrl}`
      );
    }
    if (params.sourceLang) {
      parts.push(
        `--${boundary}\r\nContent-Disposition: form-data; name="source_lang"\r\n\r\n${params.sourceLang}`
      );
    }
    parts.push(
      `--${boundary}\r\nContent-Disposition: form-data; name="target_lang"\r\n\r\n${params.targetLang}`
    );
    if (params.numSpeakers !== undefined) {
      parts.push(
        `--${boundary}\r\nContent-Disposition: form-data; name="num_speakers"\r\n\r\n${params.numSpeakers}`
      );
    }
    if (params.watermark !== undefined) {
      parts.push(
        `--${boundary}\r\nContent-Disposition: form-data; name="watermark"\r\n\r\n${params.watermark}`
      );
    }
    if (params.name) {
      parts.push(
        `--${boundary}\r\nContent-Disposition: form-data; name="name"\r\n\r\n${params.name}`
      );
    }
    if (params.highestResolution !== undefined) {
      parts.push(
        `--${boundary}\r\nContent-Disposition: form-data; name="highest_resolution"\r\n\r\n${params.highestResolution}`
      );
    }
    parts.push(
      `--${boundary}\r\nContent-Disposition: form-data; name="mode"\r\n\r\nautomatic`
    );

    let bodyStr = `${parts.join('\r\n')}\r\n--${boundary}--`;

    let response = await this.axios.post('/v1/dubbing', bodyStr, {
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      }
    });

    return response.data;
  }

  async getDubbing(dubbingId: string) {
    let response = await this.axios.get(`/v1/dubbing/${dubbingId}`);
    return response.data;
  }

  // ── Audio Isolation ──

  async isolateAudio(fileBase64: string, fileName?: string) {
    let boundary = `----SlatesBoundary${Date.now().toString(36)}`;
    let binaryStr = atob(fileBase64);
    let fName = fileName || 'audio.mp3';

    let bodyStr = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fName}"\r\nContent-Type: application/octet-stream\r\nContent-Transfer-Encoding: binary\r\n\r\n${binaryStr}\r\n--${boundary}--`;

    let response = await this.axios.post('/v1/audio-isolation', bodyStr, {
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      responseType: 'arraybuffer'
    });

    let audioData = response.data as ArrayBuffer;
    let bytes = new Uint8Array(audioData);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]!);
    }
    let base64Audio = btoa(binary);

    return {
      audioBase64: base64Audio,
      contentType: String(response.headers?.['content-type'] ?? 'audio/mpeg')
    };
  }

  // ── History ──

  async listHistory(params?: { pageSize?: number; startAfterHistoryItemId?: string }) {
    let query: Record<string, string | number> = {};
    if (params?.pageSize) query.page_size = params.pageSize;
    if (params?.startAfterHistoryItemId)
      query.start_after_history_item_id = params.startAfterHistoryItemId;

    let response = await this.axios.get('/v1/history', { params: query });
    return response.data;
  }

  async getHistoryItem(historyItemId: string) {
    let response = await this.axios.get(`/v1/history/${historyItemId}`);
    return response.data;
  }

  // ── Webhooks ──

  async createWebhook(params: { name: string; webhookUrl: string }) {
    let response = await this.axios.post('/v1/workspace/webhooks', {
      settings: {
        auth_type: 'hmac',
        name: params.name,
        webhook_url: params.webhookUrl
      }
    });
    return response.data;
  }

  async listWebhooks() {
    let response = await this.axios.get('/v1/workspace/webhooks', {
      params: { include_usages: true }
    });
    return response.data;
  }

  async deleteWebhook(webhookId: string) {
    let response = await this.axios.delete(`/v1/workspace/webhooks/${webhookId}`);
    return response.data;
  }
}

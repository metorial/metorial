import { createAxios } from 'slates';

export interface SpeechParams {
  voice: string;
  text: string;
  model?: string;
  language?: string;
  format?: string;
  sampleRate?: number;
  temperature?: number;
  topP?: number;
  seed?: number;
  store?: boolean;
}

export interface VoiceListParams {
  starred?: boolean;
  owner?: 'system' | 'me' | 'all';
}

export interface VoiceUpdateParams {
  name?: string;
  description?: string;
  gender?: string;
  starred?: boolean;
  unfreeze?: boolean;
}

export interface Voice {
  id: string;
  name: string;
  owner: string;
  state: string;
  description?: string;
  gender?: string;
  type?: string;
  starred?: boolean;
  preview_url?: string;
}

export interface AccountInfo {
  plan: {
    type: string;
    character_limit: number;
    commercial_use_allowed: boolean;
    instant_voice_limit: number;
    professional_voice_limit?: number;
  };
  usage: {
    characters: number;
    instant_voices: number;
    professional_voices: number;
  };
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(params: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.lmnt.com',
      headers: {
        'X-API-Key': params.token
      }
    });
  }

  async synthesizeSpeech(params: SpeechParams): Promise<{ audio: string; format: string }> {
    let body: Record<string, unknown> = {
      voice: params.voice,
      text: params.text
    };

    if (params.model !== undefined) body.model = params.model;
    if (params.language !== undefined) body.language = params.language;
    if (params.format !== undefined) body.format = params.format;
    if (params.sampleRate !== undefined) body.sample_rate = params.sampleRate;
    if (params.temperature !== undefined) body.temperature = params.temperature;
    if (params.topP !== undefined) body.top_p = params.topP;
    if (params.seed !== undefined) body.seed = params.seed;
    if (params.store !== undefined) body.debug = params.store;

    let response = await this.axios.post('/v1/ai/speech/bytes', body, {
      responseType: 'arraybuffer',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    let outputFormat = params.format || 'mp3';

    let audioBuffer = Buffer.from(response.data);
    let base64Audio = audioBuffer.toString('base64');

    return {
      audio: base64Audio,
      format: outputFormat
    };
  }

  async listVoices(params?: VoiceListParams): Promise<Voice[]> {
    let queryParams: Record<string, string> = {};
    if (params?.starred !== undefined) queryParams.starred = String(params.starred);
    if (params?.owner !== undefined) queryParams.owner = params.owner;

    let response = await this.axios.get('/v1/ai/voice/list', { params: queryParams });
    return response.data;
  }

  async getVoice(voiceId: string): Promise<Voice> {
    let response = await this.axios.get(`/v1/ai/voice/${voiceId}`);
    return response.data;
  }

  async updateVoice(voiceId: string, params: VoiceUpdateParams): Promise<Voice> {
    let body: Record<string, unknown> = {};
    if (params.name !== undefined) body.name = params.name;
    if (params.description !== undefined) body.description = params.description;
    if (params.gender !== undefined) body.gender = params.gender;
    if (params.starred !== undefined) body.starred = params.starred;
    if (params.unfreeze !== undefined) body.unfreeze = params.unfreeze;

    let response = await this.axios.put(`/v1/ai/voice/${voiceId}`, body, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data.voice ?? response.data;
  }

  async deleteVoice(voiceId: string): Promise<void> {
    await this.axios.delete(`/v1/ai/voice/${voiceId}`);
  }

  async getAccount(): Promise<AccountInfo> {
    let response = await this.axios.get('/v1/account');
    return response.data;
  }
}

import { lmntShutdownError } from '../retirement';

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

// Keep the legacy client signatures while preventing calls to a retired service.
export class Client {
  constructor(_params: { token: string }) {
    throw lmntShutdownError();
  }

  async synthesizeSpeech(_params: SpeechParams): Promise<{ audio: string; format: string }> {
    throw lmntShutdownError();
  }

  async listVoices(_params?: VoiceListParams): Promise<Voice[]> {
    throw lmntShutdownError();
  }

  async getVoice(_voiceId: string): Promise<Voice> {
    throw lmntShutdownError();
  }

  async updateVoice(_voiceId: string, _params: VoiceUpdateParams): Promise<Voice> {
    throw lmntShutdownError();
  }

  async deleteVoice(_voiceId: string): Promise<void> {
    throw lmntShutdownError();
  }

  async getAccount(): Promise<AccountInfo> {
    throw lmntShutdownError();
  }
}

import { createAxios } from 'slates';

let apiAxios = createAxios({
  baseURL: 'https://aivoov.com/api/v8'
});

export interface AivoovVoice {
  voiceId: string;
  name: string;
  language: string;
}

export interface TextSegment {
  voiceId: string;
  text: string;
  pitch?: number | string;
  speakingRate?: number | string;
  volume?: number | string;
}

export interface CreateAudioResponse {
  status: boolean;
  message: string;
  audio: string;
}

export class Client {
  constructor(private credentials: { token: string }) {}

  private get headers() {
    return {
      'X-API-KEY': this.credentials.token
    };
  }

  async getVoices(languageCode?: string): Promise<AivoovVoice[]> {
    let params: Record<string, string> = {};
    if (languageCode) {
      params.language_code = languageCode;
    }

    let response = await apiAxios.get('/voices', {
      headers: this.headers,
      params
    });

    let voices: AivoovVoice[] = (response.data as any[]).map((v: any) => ({
      voiceId: v.voice_id,
      name: v.name,
      language: v.language
    }));

    return voices;
  }

  async createAudio(segments: TextSegment[]): Promise<CreateAudioResponse> {
    let formParams = new URLSearchParams();

    for (let segment of segments) {
      formParams.append('voice_id[]', segment.voiceId);
      formParams.append('transcribe_text[]', segment.text);
      formParams.append(
        'transcribe_ssml_pitch_rate[]',
        segment.pitch !== undefined ? String(segment.pitch) : 'default'
      );
      formParams.append(
        'transcribe_ssml_spk_rate[]',
        segment.speakingRate !== undefined ? String(segment.speakingRate) : 'default'
      );
      formParams.append(
        'transcribe_ssml_volume[]',
        segment.volume !== undefined ? String(segment.volume) : 'default'
      );
    }

    let response = await apiAxios.post('/create', formParams.toString(), {
      headers: {
        ...this.headers,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    return response.data as CreateAudioResponse;
  }
}

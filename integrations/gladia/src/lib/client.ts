import { createAxios } from 'slates';
import type {
  LiveSessionInitResponse,
  LiveSessionRequestParams,
  TranscriptionInitResponse,
  TranscriptionRequestParams,
  TranscriptionResponse,
  UploadResponse
} from './types';

export class Client {
  private axios;

  constructor(params: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.gladia.io',
      headers: {
        'x-gladia-key': params.token,
        'Content-Type': 'application/json'
      }
    });
  }

  async uploadAudioFromUrl(audioUrl: string): Promise<UploadResponse> {
    let response = await this.axios.post('/v2/upload', {
      audio_url: audioUrl
    });
    return response.data;
  }

  async initiateTranscription(
    params: TranscriptionRequestParams
  ): Promise<TranscriptionInitResponse> {
    let response = await this.axios.post('/v2/pre-recorded', params);
    return response.data;
  }

  async getTranscription(transcriptionId: string): Promise<TranscriptionResponse> {
    let response = await this.axios.get(`/v2/pre-recorded/${transcriptionId}`);
    return response.data;
  }

  async deleteTranscription(transcriptionId: string): Promise<void> {
    await this.axios.delete(`/v2/pre-recorded/${transcriptionId}`);
  }

  async initiateLiveSession(
    params: LiveSessionRequestParams
  ): Promise<LiveSessionInitResponse> {
    let response = await this.axios.post('/v2/live', params);
    return response.data;
  }

  async getLiveSessionResult(sessionId: string): Promise<TranscriptionResponse> {
    let response = await this.axios.get(`/v2/live/${sessionId}`);
    return response.data;
  }

  async pollTranscriptionUntilDone(
    transcriptionId: string,
    maxAttempts: number = 60,
    intervalMs: number = 5000
  ): Promise<TranscriptionResponse> {
    for (let i = 0; i < maxAttempts; i++) {
      let result = await this.getTranscription(transcriptionId);
      if (result.status === 'done' || result.status === 'error') {
        return result;
      }
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    throw new Error(
      `Transcription ${transcriptionId} did not complete within the maximum polling time`
    );
  }
}

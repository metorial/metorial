import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  requestAxiosData
} from 'slates';
import type {
  ListTranscriptionsParams,
  ListTranscriptionsResponse,
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
      timeout: 60000,
      headers: {
        'x-gladia-key': params.token,
        'Content-Type': 'application/json'
      }
    });
  }

  async uploadAudioFromUrl(audioUrl: string): Promise<UploadResponse> {
    return this.request<UploadResponse>('upload audio', () =>
      this.axios.post('/v2/upload', { audio_url: audioUrl })
    );
  }

  async initiateTranscription(
    params: TranscriptionRequestParams
  ): Promise<TranscriptionInitResponse> {
    return this.request<TranscriptionInitResponse>('initiate transcription', () =>
      this.axios.post('/v2/pre-recorded', params)
    );
  }

  async getTranscription(transcriptionId: string): Promise<TranscriptionResponse> {
    return this.request<TranscriptionResponse>('get transcription', () =>
      this.axios.get(`/v2/pre-recorded/${encodeURIComponent(transcriptionId)}`)
    );
  }

  async deleteTranscription(transcriptionId: string): Promise<void> {
    await this.request('delete transcription', () =>
      this.axios.delete(`/v2/pre-recorded/${encodeURIComponent(transcriptionId)}`)
    );
  }

  async initiateLiveSession(
    params: LiveSessionRequestParams
  ): Promise<LiveSessionInitResponse> {
    let { region, ...body } = params;
    return this.request<LiveSessionInitResponse>('initiate live session', () =>
      this.axios.post('/v2/live', body, { params: { region } })
    );
  }

  async getLiveSessionResult(sessionId: string): Promise<TranscriptionResponse> {
    return this.request<TranscriptionResponse>('get live session result', () =>
      this.axios.get(`/v2/live/${encodeURIComponent(sessionId)}`)
    );
  }

  async deleteLiveSession(sessionId: string): Promise<void> {
    await this.request('delete live session', () =>
      this.axios.delete(`/v2/live/${encodeURIComponent(sessionId)}`)
    );
  }

  async listTranscriptions(
    params: ListTranscriptionsParams
  ): Promise<ListTranscriptionsResponse> {
    let { kind = 'pre-recorded', ...query } = params;
    return this.request<ListTranscriptionsResponse>('list transcriptions', () =>
      this.axios.get(`/v2/${kind}`, {
        params: query,
        // Gladia documents repeated status query parameters, not status[] keys.
        paramsSerializer: { indexes: null }
      })
    );
  }

  private request<T>(
    operation: string,
    run: Parameters<typeof requestAxiosData<T>>[1]
  ): Promise<T> {
    return requestAxiosData(operation, run, (error, action) =>
      buildApiServiceError(error, {
        parent: {},
        providerLabel: 'Gladia',
        reason: 'gladia_api_error',
        operation: action,
        nestedKeys: ['errors', 'validation_errors']
      })
    );
  }

  async pollTranscriptionUntilDone(
    transcriptionId: string,
    maxAttempts: number = 60,
    intervalMs: number = 5000
  ): Promise<TranscriptionResponse> {
    for (let i = 0; i < maxAttempts; i++) {
      let result: TranscriptionResponse;
      try {
        result = await this.getTranscription(transcriptionId);
      } catch (error) {
        let serviceError = buildApiServiceError(error, {
          providerLabel: 'Gladia',
          reason: 'gladia_api_error',
          operation: 'poll transcription'
        });
        let remediation = `Transcription ${transcriptionId} could not be checked. Call get_transcription again to retrieve its status.`;
        serviceError.data.message = `${serviceError.data.message} ${remediation}`;
        serviceError.data.transcriptionId = transcriptionId;
        serviceError.message = `${serviceError.message} ${remediation}`;
        throw serviceError;
      }
      if (result.status === 'done' || result.status === 'error') {
        return result;
      }
      if (i < maxAttempts - 1) await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    throw createApiServiceError(
      `Transcription ${transcriptionId} is still processing. Call get_transcription again to retrieve its result.`,
      { reason: 'gladia_polling_timeout' }
    );
  }
}

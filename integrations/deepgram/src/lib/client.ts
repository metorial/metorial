import { createAxios } from 'slates';

export class DeepgramClient {
  private axios;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: 'https://api.deepgram.com',
      headers: {
        Authorization: `Token ${token}`
      }
    });
  }

  // ─── Speech-to-Text (Pre-recorded) ────────────────────────────────────

  async transcribeUrl(params: {
    url: string;
    model?: string;
    language?: string;
    detectLanguage?: boolean;
    punctuate?: boolean;
    smartFormat?: boolean;
    diarize?: boolean;
    utterances?: boolean;
    keywords?: string[];
    search?: string[];
    summarize?: boolean;
    topics?: boolean;
    intents?: boolean;
    sentiment?: boolean;
    paragraphs?: boolean;
    redact?: string[];
    tag?: string;
    callback?: string;
    callbackMethod?: string;
  }) {
    let queryParams = this.buildTranscriptionParams(params);

    let response = await this.axios.post(
      `/v1/listen${queryParams}`,
      {
        url: params.url
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

    return response.data;
  }

  async transcribeAudio(params: {
    audioData: string; // base64-encoded audio
    mimetype: string;
    model?: string;
    language?: string;
    detectLanguage?: boolean;
    punctuate?: boolean;
    smartFormat?: boolean;
    diarize?: boolean;
    utterances?: boolean;
    keywords?: string[];
    search?: string[];
    summarize?: boolean;
    topics?: boolean;
    intents?: boolean;
    sentiment?: boolean;
    paragraphs?: boolean;
    redact?: string[];
    tag?: string;
    callback?: string;
    callbackMethod?: string;
  }) {
    let queryParams = this.buildTranscriptionParams(params);

    let binaryString = atob(params.audioData);
    let bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    let response = await this.axios.post(`/v1/listen${queryParams}`, bytes, {
      headers: { 'Content-Type': params.mimetype }
    });

    return response.data;
  }

  private buildTranscriptionParams(params: {
    model?: string;
    language?: string;
    detectLanguage?: boolean;
    punctuate?: boolean;
    smartFormat?: boolean;
    diarize?: boolean;
    utterances?: boolean;
    keywords?: string[];
    search?: string[];
    summarize?: boolean;
    topics?: boolean;
    intents?: boolean;
    sentiment?: boolean;
    paragraphs?: boolean;
    redact?: string[];
    tag?: string;
    callback?: string;
    callbackMethod?: string;
  }): string {
    let searchParams = new URLSearchParams();

    if (params.model) searchParams.set('model', params.model);
    if (params.language) searchParams.set('language', params.language);
    if (params.detectLanguage) searchParams.set('detect_language', 'true');
    if (params.punctuate) searchParams.set('punctuate', 'true');
    if (params.smartFormat) searchParams.set('smart_format', 'true');
    if (params.diarize) searchParams.set('diarize', 'true');
    if (params.utterances) searchParams.set('utterances', 'true');
    if (params.summarize) searchParams.set('summarize', 'v2');
    if (params.topics) searchParams.set('topics', 'true');
    if (params.intents) searchParams.set('intents', 'true');
    if (params.sentiment) searchParams.set('sentiment', 'true');
    if (params.paragraphs) searchParams.set('paragraphs', 'true');
    if (params.tag) searchParams.set('tag', params.tag);
    if (params.callback) searchParams.set('callback', params.callback);
    if (params.callbackMethod) searchParams.set('callback_method', params.callbackMethod);

    if (params.keywords) {
      for (let kw of params.keywords) {
        searchParams.append('keywords', kw);
      }
    }
    if (params.search) {
      for (let s of params.search) {
        searchParams.append('search', s);
      }
    }
    if (params.redact) {
      for (let r of params.redact) {
        searchParams.append('redact', r);
      }
    }

    let qs = searchParams.toString();
    return qs ? `?${qs}` : '';
  }

  // ─── Text-to-Speech ───────────────────────────────────────────────────

  async textToSpeech(params: {
    text: string;
    model?: string;
    encoding?: string;
    sampleRate?: number;
    bitRate?: number;
    container?: string;
    callback?: string;
    callbackMethod?: string;
  }): Promise<{ contentType: string; audioBase64: string; requestId?: string }> {
    let searchParams = new URLSearchParams();

    if (params.model) searchParams.set('model', params.model);
    if (params.encoding) searchParams.set('encoding', params.encoding);
    if (params.sampleRate) searchParams.set('sample_rate', String(params.sampleRate));
    if (params.bitRate) searchParams.set('bit_rate', String(params.bitRate));
    if (params.container) searchParams.set('container', params.container);
    if (params.callback) searchParams.set('callback', params.callback);
    if (params.callbackMethod) searchParams.set('callback_method', params.callbackMethod);

    let qs = searchParams.toString();
    let url = `/v1/speak${qs ? `?${qs}` : ''}`;

    // If callback is set, Deepgram returns JSON with request_id
    if (params.callback) {
      let response = await this.axios.post(
        url,
        { text: params.text },
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );
      return {
        contentType: 'application/json',
        audioBase64: '',
        requestId: response.data.request_id
      };
    }

    let response = await this.axios.post(
      url,
      { text: params.text },
      {
        headers: { 'Content-Type': 'application/json' },
        responseType: 'arraybuffer'
      }
    );

    let binary = '';
    let bytes = new Uint8Array(response.data);
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]!);
    }
    let audioBase64 = btoa(binary);

    return {
      contentType: String(response.headers['content-type'] ?? 'audio/mp3'),
      audioBase64,
      requestId:
        typeof response.headers['dg-request-id'] === 'string'
          ? response.headers['dg-request-id']
          : undefined
    };
  }

  // ─── Text Intelligence ────────────────────────────────────────────────

  async analyzeText(params: {
    text: string;
    language?: string;
    summarize?: boolean;
    topics?: boolean;
    intents?: boolean;
    sentiment?: boolean;
  }) {
    let searchParams = new URLSearchParams();

    if (params.language) searchParams.set('language', params.language);
    if (params.summarize) searchParams.set('summarize', 'true');
    if (params.topics) searchParams.set('topics', 'true');
    if (params.intents) searchParams.set('intents', 'true');
    if (params.sentiment) searchParams.set('sentiment', 'true');

    let qs = searchParams.toString();
    let url = `/v1/read${qs ? `?${qs}` : ''}`;

    let response = await this.axios.post(
      url,
      { text: params.text },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

    return response.data;
  }

  // ─── Project Management ───────────────────────────────────────────────

  async listProjects() {
    let response = await this.axios.get('/v1/projects');
    return response.data;
  }

  async getProject(projectId: string) {
    let response = await this.axios.get(`/v1/projects/${projectId}`);
    return response.data;
  }

  async updateProject(projectId: string, params: { name?: string; company?: string }) {
    let response = await this.axios.patch(`/v1/projects/${projectId}`, params, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async deleteProject(projectId: string) {
    await this.axios.delete(`/v1/projects/${projectId}`);
  }

  // ─── Project Members ──────────────────────────────────────────────────

  async listMembers(projectId: string) {
    let response = await this.axios.get(`/v1/projects/${projectId}/members`);
    return response.data;
  }

  async removeMember(projectId: string, memberId: string) {
    await this.axios.delete(`/v1/projects/${projectId}/members/${memberId}`);
  }

  async getMemberScopes(projectId: string, memberId: string) {
    let response = await this.axios.get(
      `/v1/projects/${projectId}/members/${memberId}/scopes`
    );
    return response.data;
  }

  async updateMemberScopes(projectId: string, memberId: string, scope: string) {
    let response = await this.axios.put(
      `/v1/projects/${projectId}/members/${memberId}/scopes`,
      {
        scope
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    return response.data;
  }

  // ─── Invitations ──────────────────────────────────────────────────────

  async listInvitations(projectId: string) {
    let response = await this.axios.get(`/v1/projects/${projectId}/invites`);
    return response.data;
  }

  async sendInvitation(projectId: string, email: string, scope: string) {
    let response = await this.axios.post(
      `/v1/projects/${projectId}/invites`,
      {
        email,
        scope
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    return response.data;
  }

  async deleteInvitation(projectId: string, email: string) {
    await this.axios.delete(`/v1/projects/${projectId}/invites/${email}`);
  }

  // ─── API Keys ─────────────────────────────────────────────────────────

  async listKeys(projectId: string) {
    let response = await this.axios.get(`/v1/projects/${projectId}/keys`);
    return response.data;
  }

  async getKey(projectId: string, keyId: string) {
    let response = await this.axios.get(`/v1/projects/${projectId}/keys/${keyId}`);
    return response.data;
  }

  async createKey(
    projectId: string,
    params: {
      comment: string;
      scopes: string[];
      tags?: string[];
      expirationDate?: string;
      timeToLiveInSeconds?: number;
    }
  ) {
    let response = await this.axios.post(`/v1/projects/${projectId}/keys`, params, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async deleteKey(projectId: string, keyId: string) {
    await this.axios.delete(`/v1/projects/${projectId}/keys/${keyId}`);
  }

  // ─── Usage ────────────────────────────────────────────────────────────

  async getUsage(
    projectId: string,
    params?: {
      start?: string;
      end?: string;
      accessor?: string;
      tag?: string;
      method?: string;
      model?: string;
    }
  ) {
    let searchParams = new URLSearchParams();
    if (params?.start) searchParams.set('start', params.start);
    if (params?.end) searchParams.set('end', params.end);
    if (params?.accessor) searchParams.set('accessor', params.accessor);
    if (params?.tag) searchParams.set('tag', params.tag);
    if (params?.method) searchParams.set('method', params.method);
    if (params?.model) searchParams.set('model', params.model);

    let qs = searchParams.toString();
    let response = await this.axios.get(
      `/v1/projects/${projectId}/usage${qs ? `?${qs}` : ''}`
    );
    return response.data;
  }

  async getUsageFields(projectId: string, params?: { start?: string; end?: string }) {
    let searchParams = new URLSearchParams();
    if (params?.start) searchParams.set('start', params.start);
    if (params?.end) searchParams.set('end', params.end);

    let qs = searchParams.toString();
    let response = await this.axios.get(
      `/v1/projects/${projectId}/usage/fields${qs ? `?${qs}` : ''}`
    );
    return response.data;
  }

  // ─── Balances ─────────────────────────────────────────────────────────

  async getBalances(projectId: string) {
    let response = await this.axios.get(`/v1/projects/${projectId}/balances`);
    return response.data;
  }

  async getBalance(projectId: string, balanceId: string) {
    let response = await this.axios.get(`/v1/projects/${projectId}/balances/${balanceId}`);
    return response.data;
  }

  // ─── Models ───────────────────────────────────────────────────────────

  async listModels(params?: { includeOutdated?: boolean }) {
    let searchParams = new URLSearchParams();
    if (params?.includeOutdated) searchParams.set('include_outdated', 'true');

    let qs = searchParams.toString();
    let response = await this.axios.get(`/v1/models${qs ? `?${qs}` : ''}`);
    return response.data;
  }

  async getModel(modelId: string) {
    let response = await this.axios.get(`/v1/models/${modelId}`);
    return response.data;
  }
}

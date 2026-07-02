import { createAxios } from 'slates';
import { deepgramApiError, deepgramServiceError } from './errors';

type CustomMode = 'strict' | 'extended';

type TranscriptionParams = {
  model?: string;
  version?: string;
  language?: string;
  detectLanguage?: boolean;
  detectEntities?: boolean;
  punctuate?: boolean;
  smartFormat?: boolean;
  diarize?: boolean;
  diarizeModel?: 'latest' | 'v1' | 'v2';
  utterances?: boolean;
  dictation?: boolean;
  encoding?: string;
  fillerWords?: boolean;
  measurements?: boolean;
  multichannel?: boolean;
  numerals?: boolean;
  keywords?: string[];
  keyterms?: string[];
  search?: string[];
  replace?: string[];
  summarize?: boolean;
  topics?: boolean;
  intents?: boolean;
  sentiment?: boolean;
  paragraphs?: boolean;
  redact?: string[];
  customTopics?: string[];
  customTopicMode?: CustomMode;
  customIntents?: string[];
  customIntentMode?: CustomMode;
  profanityFilter?: boolean;
  uttSplit?: number;
  mipOptOut?: boolean;
  tag?: string;
  callback?: string;
  callbackMethod?: string;
};

type TextToSpeechParams = {
  text: string;
  model?: string;
  encoding?: string;
  sampleRate?: number;
  bitRate?: number;
  container?: string;
  speed?: number;
  tag?: string;
  mipOptOut?: boolean;
  callback?: string;
  callbackMethod?: string;
};

type TextToSpeechResult = {
  contentType: string;
  audioBase64?: string;
  byteLength: number;
  requestId?: string;
  callbackSubmitted: boolean;
};

type AnalyzeTextParams = {
  text?: string;
  url?: string;
  language?: string;
  summarize?: boolean;
  topics?: boolean;
  intents?: boolean;
  sentiment?: boolean;
  customTopics?: string[];
  customTopicMode?: CustomMode;
  customIntents?: string[];
  customIntentMode?: CustomMode;
  tag?: string;
  callback?: string;
  callbackMethod?: string;
};

type UsageBreakdownParams = {
  start?: string;
  end?: string;
  grouping?: string;
  accessor?: string;
  tag?: string;
  method?: string;
  model?: string;
  endpoint?: string;
  deployment?: string;
  featuresUsed?: string[];
};

type BillingBreakdownParams = {
  start?: string;
  end?: string;
  accessor?: string;
  deployment?: string;
  tag?: string;
  lineItem?: string;
  grouping?: string[];
};

let appendListParam = (
  searchParams: URLSearchParams,
  key: string,
  values: string[] | undefined
) => {
  for (let value of values ?? []) {
    if (value) {
      searchParams.append(key, value);
    }
  }
};

let bufferFromBase64 = (value: string) => {
  let buffer = Buffer.from(value, 'base64');
  if (buffer.length === 0) {
    throw deepgramServiceError('audioData must contain non-empty base64-encoded audio.');
  }

  return buffer;
};

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

  private async request<T>(operation: string, run: () => Promise<T>) {
    try {
      return await run();
    } catch (error) {
      throw deepgramApiError(error, operation);
    }
  }

  // Speech-to-Text (pre-recorded)

  async transcribeUrl(params: TranscriptionParams & { url: string }) {
    return this.request('transcribe audio URL', async () => {
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
    });
  }

  async transcribeAudio(
    params: TranscriptionParams & { audioData: string; mimetype: string }
  ) {
    return this.request('transcribe audio bytes', async () => {
      let queryParams = this.buildTranscriptionParams(params);
      let audio = bufferFromBase64(params.audioData);

      let response = await this.axios.post(`/v1/listen${queryParams}`, audio, {
        headers: { 'Content-Type': params.mimetype }
      });

      return response.data;
    });
  }

  private buildTranscriptionParams(params: TranscriptionParams): string {
    let searchParams = new URLSearchParams();

    if (params.model) searchParams.set('model', params.model);
    if (params.version) searchParams.set('version', params.version);
    if (params.language) searchParams.set('language', params.language);
    if (params.detectLanguage) searchParams.set('detect_language', 'true');
    if (params.detectEntities) searchParams.set('detect_entities', 'true');
    if (params.punctuate) searchParams.set('punctuate', 'true');
    if (params.smartFormat) searchParams.set('smart_format', 'true');
    if (params.diarize) searchParams.set('diarize', 'true');
    if (params.diarizeModel) searchParams.set('diarize_model', params.diarizeModel);
    if (params.utterances) searchParams.set('utterances', 'true');
    if (params.dictation) searchParams.set('dictation', 'true');
    if (params.encoding) searchParams.set('encoding', params.encoding);
    if (params.fillerWords) searchParams.set('filler_words', 'true');
    if (params.measurements) searchParams.set('measurements', 'true');
    if (params.multichannel) searchParams.set('multichannel', 'true');
    if (params.numerals) searchParams.set('numerals', 'true');
    if (params.summarize) searchParams.set('summarize', 'v2');
    if (params.topics) searchParams.set('topics', 'true');
    if (params.intents) searchParams.set('intents', 'true');
    if (params.sentiment) searchParams.set('sentiment', 'true');
    if (params.paragraphs) searchParams.set('paragraphs', 'true');
    if (params.profanityFilter) searchParams.set('profanity_filter', 'true');
    if (params.uttSplit !== undefined) searchParams.set('utt_split', String(params.uttSplit));
    if (params.mipOptOut) searchParams.set('mip_opt_out', 'true');
    if (params.customTopicMode) searchParams.set('custom_topic_mode', params.customTopicMode);
    if (params.customIntentMode)
      searchParams.set('custom_intent_mode', params.customIntentMode);
    if (params.tag) searchParams.set('tag', params.tag);
    if (params.callback) searchParams.set('callback', params.callback);
    if (params.callbackMethod) searchParams.set('callback_method', params.callbackMethod);

    appendListParam(searchParams, 'keywords', params.keywords);
    appendListParam(searchParams, 'keyterm', params.keyterms);
    appendListParam(searchParams, 'search', params.search);
    appendListParam(searchParams, 'replace', params.replace);
    appendListParam(searchParams, 'redact', params.redact);
    appendListParam(searchParams, 'custom_topic', params.customTopics);
    appendListParam(searchParams, 'custom_intent', params.customIntents);

    let qs = searchParams.toString();
    return qs ? `?${qs}` : '';
  }

  // Text-to-Speech

  async textToSpeech(params: TextToSpeechParams): Promise<TextToSpeechResult> {
    return this.request('text to speech', async () => {
      let searchParams = new URLSearchParams();

      if (params.model) searchParams.set('model', params.model);
      if (params.encoding) searchParams.set('encoding', params.encoding);
      if (params.sampleRate) searchParams.set('sample_rate', String(params.sampleRate));
      if (params.bitRate) searchParams.set('bit_rate', String(params.bitRate));
      if (params.container) searchParams.set('container', params.container);
      if (params.speed !== undefined) searchParams.set('speed', String(params.speed));
      if (params.tag) searchParams.set('tag', params.tag);
      if (params.mipOptOut) searchParams.set('mip_opt_out', 'true');
      if (params.callback) searchParams.set('callback', params.callback);
      if (params.callbackMethod) searchParams.set('callback_method', params.callbackMethod);

      let qs = searchParams.toString();
      let url = `/v1/speak${qs ? `?${qs}` : ''}`;

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
          byteLength: 0,
          requestId: response.data?.request_id,
          callbackSubmitted: true
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
      let audioBuffer = Buffer.from(response.data);

      return {
        contentType: String(response.headers['content-type'] ?? 'audio/mpeg'),
        audioBase64: audioBuffer.toString('base64'),
        byteLength: audioBuffer.byteLength,
        requestId:
          typeof response.headers['dg-request-id'] === 'string'
            ? response.headers['dg-request-id']
            : undefined,
        callbackSubmitted: false
      };
    });
  }

  // Text Intelligence

  async analyzeText(params: AnalyzeTextParams) {
    return this.request('analyze text', async () => {
      let searchParams = new URLSearchParams();

      if (params.language) searchParams.set('language', params.language);
      if (params.summarize) searchParams.set('summarize', 'true');
      if (params.topics) searchParams.set('topics', 'true');
      if (params.intents) searchParams.set('intents', 'true');
      if (params.sentiment) searchParams.set('sentiment', 'true');
      if (params.customTopicMode)
        searchParams.set('custom_topic_mode', params.customTopicMode);
      if (params.customIntentMode) {
        searchParams.set('custom_intent_mode', params.customIntentMode);
      }
      if (params.tag) searchParams.set('tag', params.tag);
      if (params.callback) searchParams.set('callback', params.callback);
      if (params.callbackMethod) searchParams.set('callback_method', params.callbackMethod);

      appendListParam(searchParams, 'custom_topic', params.customTopics);
      appendListParam(searchParams, 'custom_intent', params.customIntents);

      let qs = searchParams.toString();
      let url = `/v1/read${qs ? `?${qs}` : ''}`;

      let response = await this.axios.post(
        url,
        params.url ? { url: params.url } : { text: params.text },
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );

      return response.data;
    });
  }

  // Token-based authentication

  async createTemporaryToken(params?: { ttlSeconds?: number }) {
    return this.request('create temporary token', async () => {
      let body = params?.ttlSeconds ? { ttl_seconds: params.ttlSeconds } : {};
      let response = await this.axios.post('/v1/auth/grant', body, {
        headers: { 'Content-Type': 'application/json' }
      });
      return response.data;
    });
  }

  // Project Management

  async listProjects() {
    return this.request('list projects', async () => {
      let response = await this.axios.get('/v1/projects');
      return response.data;
    });
  }

  async getProject(projectId: string) {
    return this.request('get project', async () => {
      let response = await this.axios.get(`/v1/projects/${projectId}`);
      return response.data;
    });
  }

  async updateProject(projectId: string, params: { name: string }) {
    return this.request('update project', async () => {
      let response = await this.axios.patch(`/v1/projects/${projectId}`, params, {
        headers: { 'Content-Type': 'application/json' }
      });
      return response.data;
    });
  }

  async deleteProject(projectId: string) {
    return this.request('delete project', async () => {
      await this.axios.delete(`/v1/projects/${projectId}`);
    });
  }

  // Project Members

  async listMembers(projectId: string) {
    return this.request('list project members', async () => {
      let response = await this.axios.get(`/v1/projects/${projectId}/members`);
      return response.data;
    });
  }

  async removeMember(projectId: string, memberId: string) {
    return this.request('remove project member', async () => {
      await this.axios.delete(`/v1/projects/${projectId}/members/${memberId}`);
    });
  }

  async getMemberScopes(projectId: string, memberId: string) {
    return this.request('get member scopes', async () => {
      let response = await this.axios.get(
        `/v1/projects/${projectId}/members/${memberId}/scopes`
      );
      return response.data;
    });
  }

  async updateMemberScopes(projectId: string, memberId: string, scope: string) {
    return this.request('update member scopes', async () => {
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
    });
  }

  // Invitations

  async listInvitations(projectId: string) {
    return this.request('list project invitations', async () => {
      let response = await this.axios.get(`/v1/projects/${projectId}/invites`);
      return response.data;
    });
  }

  async sendInvitation(projectId: string, email: string, scope: string) {
    return this.request('send project invitation', async () => {
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
    });
  }

  async deleteInvitation(projectId: string, email: string) {
    return this.request('delete project invitation', async () => {
      await this.axios.delete(`/v1/projects/${projectId}/invites/${email}`);
    });
  }

  // API Keys

  async listKeys(projectId: string) {
    return this.request('list API keys', async () => {
      let response = await this.axios.get(`/v1/projects/${projectId}/keys`);
      return response.data;
    });
  }

  async getKey(projectId: string, keyId: string) {
    return this.request('get API key', async () => {
      let response = await this.axios.get(`/v1/projects/${projectId}/keys/${keyId}`);
      return response.data;
    });
  }

  async createKey(
    projectId: string,
    params: {
      comment: string;
      scopes: string[];
      tags?: string[];
      expirationDate?: string;
    }
  ) {
    return this.request('create API key', async () => {
      let body = {
        comment: params.comment,
        scopes: params.scopes,
        tags: params.tags,
        expiration_date: params.expirationDate
      };
      let response = await this.axios.post(`/v1/projects/${projectId}/keys`, body, {
        headers: { 'Content-Type': 'application/json' }
      });
      return response.data;
    });
  }

  async deleteKey(projectId: string, keyId: string) {
    return this.request('delete API key', async () => {
      await this.axios.delete(`/v1/projects/${projectId}/keys/${keyId}`);
    });
  }

  // Usage

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
    return this.request('get usage', async () => {
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
    });
  }

  async getUsageFields(projectId: string, params?: { start?: string; end?: string }) {
    return this.request('get usage fields', async () => {
      let searchParams = new URLSearchParams();
      if (params?.start) searchParams.set('start', params.start);
      if (params?.end) searchParams.set('end', params.end);

      let qs = searchParams.toString();
      let response = await this.axios.get(
        `/v1/projects/${projectId}/usage/fields${qs ? `?${qs}` : ''}`
      );
      return response.data;
    });
  }

  async listProjectRequests(
    projectId: string,
    params?: {
      start?: string;
      end?: string;
      limit?: number;
      status?: 'succeeded' | 'failed';
    }
  ) {
    return this.request('list project requests', async () => {
      let searchParams = new URLSearchParams();
      if (params?.start) searchParams.set('start', params.start);
      if (params?.end) searchParams.set('end', params.end);
      if (params?.limit) searchParams.set('limit', String(params.limit));
      if (params?.status) searchParams.set('status', params.status);

      let qs = searchParams.toString();
      let response = await this.axios.get(
        `/v1/projects/${projectId}/requests${qs ? `?${qs}` : ''}`
      );
      return response.data;
    });
  }

  async getProjectRequest(projectId: string, requestId: string) {
    return this.request('get project request', async () => {
      let response = await this.axios.get(`/v1/projects/${projectId}/requests/${requestId}`);
      return response.data;
    });
  }

  async getUsageBreakdown(projectId: string, params?: UsageBreakdownParams) {
    return this.request('get usage breakdown', async () => {
      let searchParams = new URLSearchParams();
      if (params?.start) searchParams.set('start', params.start);
      if (params?.end) searchParams.set('end', params.end);
      if (params?.grouping) searchParams.set('grouping', params.grouping);
      if (params?.accessor) searchParams.set('accessor', params.accessor);
      if (params?.tag) searchParams.set('tag', params.tag);
      if (params?.method) searchParams.set('method', params.method);
      if (params?.model) searchParams.set('model', params.model);
      if (params?.endpoint) searchParams.set('endpoint', params.endpoint);
      if (params?.deployment) searchParams.set('deployment', params.deployment);
      for (let feature of params?.featuresUsed ?? []) {
        searchParams.set(feature, 'true');
      }

      let qs = searchParams.toString();
      let response = await this.axios.get(
        `/v1/projects/${projectId}/usage/breakdown${qs ? `?${qs}` : ''}`
      );
      return response.data;
    });
  }

  // Balances

  async getBalances(projectId: string) {
    return this.request('get balances', async () => {
      let response = await this.axios.get(`/v1/projects/${projectId}/balances`);
      return response.data;
    });
  }

  async getBalance(projectId: string, balanceId: string) {
    return this.request('get balance', async () => {
      let response = await this.axios.get(`/v1/projects/${projectId}/balances/${balanceId}`);
      return response.data;
    });
  }

  async getBillingBreakdown(projectId: string, params?: BillingBreakdownParams) {
    return this.request('get billing breakdown', async () => {
      let searchParams = new URLSearchParams();
      if (params?.start) searchParams.set('start', params.start);
      if (params?.end) searchParams.set('end', params.end);
      if (params?.accessor) searchParams.set('accessor', params.accessor);
      if (params?.deployment) searchParams.set('deployment', params.deployment);
      if (params?.tag) searchParams.set('tag', params.tag);
      if (params?.lineItem) searchParams.set('line_item', params.lineItem);
      appendListParam(searchParams, 'grouping', params?.grouping);

      let qs = searchParams.toString();
      let response = await this.axios.get(
        `/v1/projects/${projectId}/billing/breakdown${qs ? `?${qs}` : ''}`
      );
      return response.data;
    });
  }

  async getBillingFields(projectId: string, params?: { start?: string; end?: string }) {
    return this.request('get billing fields', async () => {
      let searchParams = new URLSearchParams();
      if (params?.start) searchParams.set('start', params.start);
      if (params?.end) searchParams.set('end', params.end);

      let qs = searchParams.toString();
      let response = await this.axios.get(
        `/v1/projects/${projectId}/billing/fields${qs ? `?${qs}` : ''}`
      );
      return response.data;
    });
  }

  async listPurchases(projectId: string, params?: { limit?: number }) {
    return this.request('list purchases', async () => {
      let searchParams = new URLSearchParams();
      if (params?.limit) searchParams.set('limit', String(params.limit));

      let qs = searchParams.toString();
      let response = await this.axios.get(
        `/v1/projects/${projectId}/purchases${qs ? `?${qs}` : ''}`
      );
      return response.data;
    });
  }

  // Models

  async listModels(params?: { includeOutdated?: boolean }) {
    return this.request('list models', async () => {
      let searchParams = new URLSearchParams();
      if (params?.includeOutdated) searchParams.set('include_outdated', 'true');

      let qs = searchParams.toString();
      let response = await this.axios.get(`/v1/models${qs ? `?${qs}` : ''}`);
      return response.data;
    });
  }

  async getModel(modelId: string) {
    return this.request('get model', async () => {
      let response = await this.axios.get(`/v1/models/${modelId}`);
      return response.data;
    });
  }

  async listProjectModels(projectId: string, params?: { includeOutdated?: boolean }) {
    return this.request('list project models', async () => {
      let searchParams = new URLSearchParams();
      if (params?.includeOutdated) searchParams.set('include_outdated', 'true');

      let qs = searchParams.toString();
      let response = await this.axios.get(
        `/v1/projects/${projectId}/models${qs ? `?${qs}` : ''}`
      );
      return response.data;
    });
  }

  async getProjectModel(projectId: string, modelId: string) {
    return this.request('get project model', async () => {
      let response = await this.axios.get(`/v1/projects/${projectId}/models/${modelId}`);
      return response.data;
    });
  }
}

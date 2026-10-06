import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

type EntityRole = string | { id?: string; name: string };
export const mapEntityRoles = (roles: EntityRole[] | undefined) => ({
  roles: roles?.map(role => (typeof role === 'string' ? role : role.name)),
  roleDetails: roles?.map(role =>
    typeof role === 'string' ? { name: role } : { roleId: role.id, name: role.name }
  )
});

export class Client {
  private axios;

  constructor(private params: { token: string; apiVersion: string }) {
    if (!params.token.trim()) {
      throw createApiServiceError('A Wit.ai Server Access Token is required.');
    }
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.wit.ai',
      timeout: 60_000,
      authHeader: { value: `Bearer ${params.token}` },
      errorAdapter: error =>
        buildApiServiceError(error, {
          parent: {},
          providerLabel: 'Wit.ai',
          reason: 'wit_ai_api_error'
        })
    });
    this.axios.interceptors.response.use(response => {
      if (isApiErrorRecord(response.data) && response.data.error) {
        throw buildApiServiceError(
          { response },
          {
            providerLabel: 'Wit.ai',
            reason: 'wit_ai_api_error'
          }
        );
      }
      return response;
    });
  }

  private get v() {
    return this.params.apiVersion;
  }

  // ──────────────────────────────────────────────
  // Message / NLU
  // ──────────────────────────────────────────────

  async message(q: string, options?: { n?: number; context?: Record<string, unknown> }) {
    let params: Record<string, unknown> = { v: this.v, q };
    if (options?.n !== undefined) params.n = options.n;
    if (options?.context) params.context = JSON.stringify(options.context);

    let res = await this.axios.get('/message', { params });
    return res.data;
  }

  // ──────────────────────────────────────────────
  // Language Detection
  // ──────────────────────────────────────────────

  async detectLanguage(q: string, n?: number) {
    let params: Record<string, unknown> = { v: this.v, q };
    if (n !== undefined) params.n = n;

    let res = await this.axios.get('/language', { params });
    return res.data;
  }

  // ──────────────────────────────────────────────
  // Apps
  // ──────────────────────────────────────────────

  async listApps(limit?: number, offset?: number) {
    let params: Record<string, unknown> = { v: this.v };
    if (limit !== undefined) params.limit = limit;
    if (offset !== undefined) params.offset = offset;

    let res = await this.axios.get('/apps', { params });
    return res.data;
  }

  async getApp(appId: string) {
    let res = await this.axios.get(`/apps/${encodeURIComponent(appId)}`, {
      params: { v: this.v }
    });
    return res.data;
  }

  async createApp(app: { name: string; lang: string; private: boolean; timezone?: string }) {
    let res = await this.axios.post('/apps', app, { params: { v: this.v } });
    return res.data;
  }

  async updateApp(appId: string, app: Record<string, unknown>) {
    if (!Object.keys(app).length)
      throw createApiServiceError('Provide at least one app field to update.');
    let res = await this.axios.put(`/apps/${encodeURIComponent(appId)}`, app, {
      params: { v: this.v }
    });
    return res.data;
  }

  async deleteApp(appId: string) {
    let res = await this.axios.delete(`/apps/${encodeURIComponent(appId)}`, {
      params: { v: this.v }
    });
    return res.data;
  }

  // ──────────────────────────────────────────────
  // App Tags
  // ──────────────────────────────────────────────

  async listAppTags(appId: string) {
    let res = await this.axios.get(`/apps/${encodeURIComponent(appId)}/tags`, {
      params: { v: this.v }
    });
    return res.data;
  }

  async getAppTag(appId: string, tagName: string) {
    let res = await this.axios.get(
      `/apps/${encodeURIComponent(appId)}/tags/${encodeURIComponent(tagName)}`,
      {
        params: { v: this.v }
      }
    );
    return res.data;
  }

  async createAppTag(appId: string, tag: string) {
    let res = await this.axios.post(
      `/apps/${encodeURIComponent(appId)}/tags`,
      { tag },
      { params: { v: this.v } }
    );
    return res.data;
  }

  async deleteAppTag(appId: string, tagName: string) {
    let res = await this.axios.delete(
      `/apps/${encodeURIComponent(appId)}/tags/${encodeURIComponent(tagName)}`,
      {
        params: { v: this.v }
      }
    );
    return res.data;
  }

  // ──────────────────────────────────────────────
  // Intents
  // ──────────────────────────────────────────────

  async listIntents() {
    let res = await this.axios.get('/intents', { params: { v: this.v } });
    return res.data;
  }

  async getIntent(intentName: string) {
    let res = await this.axios.get(`/intents/${encodeURIComponent(intentName)}`, {
      params: { v: this.v }
    });
    return res.data;
  }

  async createIntent(name: string) {
    let res = await this.axios.post('/intents', { name }, { params: { v: this.v } });
    return res.data;
  }

  async deleteIntent(intentName: string) {
    let res = await this.axios.delete(`/intents/${encodeURIComponent(intentName)}`, {
      params: { v: this.v }
    });
    return res.data;
  }

  // ──────────────────────────────────────────────
  // Entities
  // ──────────────────────────────────────────────

  async listEntities() {
    let res = await this.axios.get('/entities', { params: { v: this.v } });
    return res.data;
  }

  async getEntity(entityId: string) {
    let res = await this.axios.get(`/entities/${encodeURIComponent(entityId)}`, {
      params: { v: this.v }
    });
    return res.data;
  }

  async createEntity(entity: {
    name: string;
    roles: string[];
    lookups?: string[];
    keywords?: Array<{ keyword: string; synonyms: string[] }>;
  }) {
    let res = await this.axios.post('/entities', entity, { params: { v: this.v } });
    return res.data;
  }

  async updateEntity(entityId: string, entity: Record<string, unknown>) {
    if (!Object.keys(entity).length) {
      throw createApiServiceError('Provide at least one entity field to update.');
    }
    let current = await this.getEntity(entityId);
    await this.axios.put(
      `/entities/${encodeURIComponent(entityId)}`,
      {
        name: current.name,
        roles: mapEntityRoles(current.roles).roles,
        ...entity
      },
      { params: { v: this.v } }
    );
    return this.getEntity(typeof entity.name === 'string' ? entity.name : entityId);
  }

  async deleteEntity(entityId: string) {
    let res = await this.axios.delete(`/entities/${encodeURIComponent(entityId)}`, {
      params: { v: this.v }
    });
    return res.data;
  }

  async deleteEntityRole(entityId: string, role: string) {
    let res = await this.axios.delete(
      `/entities/${encodeURIComponent(entityId)}:${encodeURIComponent(role)}`,
      { params: { v: this.v } }
    );
    return res.data;
  }

  // ──────────────────────────────────────────────
  // Entity Keywords (Values)
  // ──────────────────────────────────────────────

  async addEntityKeyword(entityId: string, keyword: { keyword: string; synonyms: string[] }) {
    let res = await this.axios.post(
      `/entities/${encodeURIComponent(entityId)}/keywords`,
      keyword,
      { params: { v: this.v } }
    );
    return res.data;
  }

  async deleteEntityKeyword(entityId: string, keyword: string) {
    let res = await this.axios.delete(
      `/entities/${encodeURIComponent(entityId)}/keywords/${encodeURIComponent(keyword)}`,
      { params: { v: this.v } }
    );
    return res.data;
  }

  async addEntityKeywordSynonym(entityId: string, keyword: string, synonym: string) {
    let res = await this.axios.post(
      `/entities/${encodeURIComponent(entityId)}/keywords/${encodeURIComponent(keyword)}/synonyms`,
      { synonym },
      { params: { v: this.v } }
    );
    return res.data;
  }

  async deleteEntityKeywordSynonym(entityId: string, keyword: string, synonym: string) {
    let res = await this.axios.delete(
      `/entities/${encodeURIComponent(entityId)}/keywords/${encodeURIComponent(keyword)}/synonyms/${encodeURIComponent(synonym)}`,
      { params: { v: this.v } }
    );
    return res.data;
  }

  // ──────────────────────────────────────────────
  // Traits
  // ──────────────────────────────────────────────

  async listTraits() {
    let res = await this.axios.get('/traits', { params: { v: this.v } });
    return res.data;
  }

  async getTrait(traitName: string) {
    let res = await this.axios.get(`/traits/${encodeURIComponent(traitName)}`, {
      params: { v: this.v }
    });
    return res.data;
  }

  async createTrait(name: string, values: string[]) {
    let res = await this.axios.post('/traits', { name, values }, { params: { v: this.v } });
    return res.data;
  }

  async deleteTrait(traitName: string) {
    let res = await this.axios.delete(`/traits/${encodeURIComponent(traitName)}`, {
      params: { v: this.v }
    });
    return res.data;
  }

  async addTraitValue(traitName: string, value: string) {
    let res = await this.axios.post(
      `/traits/${encodeURIComponent(traitName)}/values`,
      { value },
      { params: { v: this.v } }
    );
    return res.data;
  }

  async deleteTraitValue(traitName: string, value: string) {
    let res = await this.axios.delete(
      `/traits/${encodeURIComponent(traitName)}/values/${encodeURIComponent(value)}`,
      { params: { v: this.v } }
    );
    return res.data;
  }

  // ──────────────────────────────────────────────
  // Utterances (Training Data / Samples)
  // ──────────────────────────────────────────────

  async listUtterances(limit?: number, offset?: number, intents?: string[]) {
    let params: Record<string, unknown> = { v: this.v };
    if (limit !== undefined) params.limit = limit;
    if (offset !== undefined) params.offset = offset;

    if (intents?.length) params.intents = intents;
    let res = await this.axios.get('/utterances', {
      params,
      paramsSerializer: { indexes: null }
    });
    return res.data;
  }

  async trainUtterances(
    utterances: Array<{
      text: string;
      intent?: string;
      entities?: Array<{
        entity: string;
        start: number;
        end: number;
        body: string;
        entities?: unknown[];
      }>;
      traits?: Array<{
        trait: string;
        value: string;
      }>;
    }>
  ) {
    let res = await this.axios.post('/utterances', utterances, { params: { v: this.v } });
    return res.data;
  }

  async deleteUtterances(texts: string[]) {
    let res = await this.axios.delete('/utterances', {
      params: { v: this.v },
      data: texts.map(text => ({ text }))
    });
    return res.data;
  }

  // ──────────────────────────────────────────────
  // Export / Import
  // ──────────────────────────────────────────────

  async exportApp() {
    let res = await this.axios.get('/export', { params: { v: this.v } });
    return res.data;
  }

  async getExportUri() {
    let result = await this.exportApp();
    let uri = typeof result === 'string' ? result : result?.uri;
    let url: URL;
    try {
      url = new URL(uri);
    } catch {
      throw createApiServiceError('Wit.ai did not return a valid app export URL.');
    }
    if (url.protocol !== 'https:') {
      throw createApiServiceError('Wit.ai did not return a secure app export URL.');
    }
    return url.href;
  }

  // ──────────────────────────────────────────────
  // Voices (for Synthesis)
  // ──────────────────────────────────────────────

  async listVoices() {
    let res = await this.axios.get('/voices', { params: { v: this.v } });
    return res.data;
  }

  // ──────────────────────────────────────────────
  // Synthesize (Text-to-Speech)
  // ──────────────────────────────────────────────

  async synthesize(params: {
    q: string;
    voice: string;
    style?: string;
    speed?: number;
    pitch?: number;
    gain?: number;
  }) {
    let res = await this.axios.post('/synthesize', params, {
      params: { v: this.v },
      responseType: 'arraybuffer'
    });
    return res;
  }
}

import { createAxios } from 'slates';
import { elasticsearchApiError } from './errors';

export class ElasticsearchClient {
  private baseUrl: string;
  private authHeader: string;

  constructor(config: { baseUrl: string; authHeader: string }) {
    this.baseUrl = config.baseUrl;
    this.authHeader = config.authHeader;
  }

  private get axios() {
    let ax = createAxios({
      baseURL: this.baseUrl,
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json'
      }
    });

    ax.interceptors.response.use(
      response => response,
      error => {
        throw elasticsearchApiError(error);
      }
    );

    return ax;
  }

  // ===== Document Management =====

  async indexDocument(
    index: string,
    body: Record<string, any>,
    documentId?: string,
    pipeline?: string
  ) {
    let options = pipeline ? { params: { pipeline } } : undefined;
    if (documentId) {
      let response = await this.axios.put(
        `/${encodeURIComponent(index)}/_doc/${encodeURIComponent(documentId)}`,
        body,
        options
      );
      return response.data;
    }
    let response = await this.axios.post(`/${encodeURIComponent(index)}/_doc`, body, options);
    return response.data;
  }

  async getDocument(index: string, documentId: string) {
    let response = await this.axios.get(
      `/${encodeURIComponent(index)}/_doc/${encodeURIComponent(documentId)}`
    );
    return response.data;
  }

  async updateDocument(
    index: string,
    documentId: string,
    doc: Record<string, any>,
    script?: Record<string, any>
  ) {
    let body: Record<string, any> = {};
    if (script) {
      body.script = script;
    } else {
      body.doc = doc;
    }
    let response = await this.axios.post(
      `/${encodeURIComponent(index)}/_update/${encodeURIComponent(documentId)}`,
      body
    );
    return response.data;
  }

  async deleteDocument(index: string, documentId: string) {
    let response = await this.axios.delete(
      `/${encodeURIComponent(index)}/_doc/${encodeURIComponent(documentId)}`
    );
    return response.data;
  }

  async bulkOperations(operations: string) {
    let response = await this.axios.post('/_bulk', operations, {
      headers: {
        'Content-Type': 'application/x-ndjson'
      }
    });
    return response.data;
  }

  async multiGet(docs: Array<{ indexName: string; documentId: string }>) {
    let body = {
      docs: docs.map(d => ({ _index: d.indexName, _id: d.documentId }))
    };
    let response = await this.axios.post('/_mget', body);
    return response.data;
  }

  // ===== Search =====

  async search(index: string | undefined, body: Record<string, any>) {
    let path = index ? `/${encodeURIComponent(index)}/_search` : '/_search';
    let response = await this.axios.post(path, body);
    return response.data;
  }

  async asyncSearch(
    index: string | undefined,
    body: Record<string, any>,
    params?: Record<string, any>
  ) {
    let path = index ? `/${encodeURIComponent(index)}/_async_search` : '/_async_search';
    let response = await this.axios.post(path, body, { params });
    return response.data;
  }

  async getAsyncSearch(searchId: string) {
    let response = await this.axios.get(`/_async_search/${encodeURIComponent(searchId)}`);
    return response.data;
  }

  async deleteAsyncSearch(searchId: string) {
    let response = await this.axios.delete(`/_async_search/${encodeURIComponent(searchId)}`);
    return response.data;
  }

  async esql(query: string, params?: Record<string, any>) {
    let body: Record<string, any> = { query };
    if (params) {
      body = { ...body, ...params };
    }
    let response = await this.axios.post('/_query', body);
    return response.data;
  }

  async count(index?: string, body?: Record<string, any>) {
    let path = index ? `/${encodeURIComponent(index)}/_count` : '/_count';
    let response = await this.axios.post(path, body || {});
    return response.data;
  }

  // ===== Index Management =====

  async createIndex(index: string, body?: Record<string, any>) {
    let response = await this.axios.put(`/${encodeURIComponent(index)}`, body || {});
    return response.data;
  }

  async deleteIndex(index: string) {
    let response = await this.axios.delete(`/${encodeURIComponent(index)}`);
    return response.data;
  }

  async getIndex(index: string) {
    let response = await this.axios.get(`/${encodeURIComponent(index)}`);
    return response.data;
  }

  async indexExists(index: string): Promise<boolean> {
    try {
      await this.axios.head(`/${encodeURIComponent(index)}`);
      return true;
    } catch (error) {
      let status =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: { status?: unknown } }).response?.status === 'number'
          ? (error as { response: { status: number } }).response.status
          : typeof error === 'object' &&
              error !== null &&
              'data' in error &&
              typeof (error as { data?: { upstreamStatus?: unknown } }).data
                ?.upstreamStatus === 'number'
            ? (error as { data: { upstreamStatus: number } }).data.upstreamStatus
            : undefined;
      if (status === 404) {
        return false;
      }

      throw elasticsearchApiError(error, 'check index existence');
    }
  }

  async openIndex(index: string) {
    let response = await this.axios.post(`/${encodeURIComponent(index)}/_open`);
    return response.data;
  }

  async closeIndex(index: string) {
    let response = await this.axios.post(`/${encodeURIComponent(index)}/_close`);
    return response.data;
  }

  async getMapping(index: string) {
    let response = await this.axios.get(`/${encodeURIComponent(index)}/_mapping`);
    return response.data;
  }

  async putMapping(index: string, body: Record<string, any>) {
    let response = await this.axios.put(`/${encodeURIComponent(index)}/_mapping`, body);
    return response.data;
  }

  async getSettings(index: string) {
    let response = await this.axios.get(`/${encodeURIComponent(index)}/_settings`);
    return response.data;
  }

  async putSettings(index: string, body: Record<string, any>) {
    let response = await this.axios.put(`/${encodeURIComponent(index)}/_settings`, body);
    return response.data;
  }

  async listIndices(params?: Record<string, any>) {
    let response = await this.axios.get('/_cat/indices', {
      params: { format: 'json', ...params }
    });
    return response.data;
  }

  async putAlias(index: string, aliasName: string, body?: Record<string, any>) {
    let response = await this.axios.put(
      `/${encodeURIComponent(index)}/_alias/${encodeURIComponent(aliasName)}`,
      body || {}
    );
    return response.data;
  }

  async deleteAlias(index: string, aliasName: string) {
    let response = await this.axios.delete(
      `/${encodeURIComponent(index)}/_alias/${encodeURIComponent(aliasName)}`
    );
    return response.data;
  }

  async getAliases(index?: string) {
    let path = index ? `/${encodeURIComponent(index)}/_alias` : '/_alias';
    let response = await this.axios.get(path);
    return response.data;
  }

  // ===== Cluster =====

  async clusterHealth(params?: Record<string, any>) {
    let response = await this.axios.get('/_cluster/health', { params });
    return response.data;
  }

  async clusterStats() {
    let response = await this.axios.get('/_cluster/stats');
    return response.data;
  }

  async nodeStats(nodeId?: string) {
    let path = nodeId ? `/_nodes/${encodeURIComponent(nodeId)}/stats` : '/_nodes/stats';
    let response = await this.axios.get(path);
    return response.data;
  }

  async nodeInfo(nodeId?: string) {
    let path = nodeId ? `/_nodes/${encodeURIComponent(nodeId)}` : '/_nodes';
    let response = await this.axios.get(path);
    return response.data;
  }

  async clusterSettings(params?: Record<string, any>) {
    let response = await this.axios.get('/_cluster/settings', {
      params: { include_defaults: false, ...params }
    });
    return response.data;
  }

  async putClusterSettings(body: Record<string, any>) {
    let response = await this.axios.put('/_cluster/settings', body);
    return response.data;
  }

  async pendingTasks() {
    let response = await this.axios.get('/_cluster/pending_tasks');
    return response.data;
  }

  // ===== Snapshots =====

  async createSnapshotRepository(repoName: string, body: Record<string, any>) {
    let response = await this.axios.put(`/_snapshot/${encodeURIComponent(repoName)}`, body);
    return response.data;
  }

  async getSnapshotRepository(repoName?: string) {
    let path = repoName ? `/_snapshot/${encodeURIComponent(repoName)}` : '/_snapshot';
    let response = await this.axios.get(path);
    return response.data;
  }

  async createSnapshot(repoName: string, snapshotName: string, body?: Record<string, any>) {
    let response = await this.axios.put(
      `/_snapshot/${encodeURIComponent(repoName)}/${encodeURIComponent(snapshotName)}`,
      body || {},
      { params: { wait_for_completion: false } }
    );
    return response.data;
  }

  async getSnapshot(repoName: string, snapshotName: string) {
    let response = await this.axios.get(
      `/_snapshot/${encodeURIComponent(repoName)}/${encodeURIComponent(snapshotName)}`
    );
    return response.data;
  }

  async deleteSnapshot(repoName: string, snapshotName: string) {
    let response = await this.axios.delete(
      `/_snapshot/${encodeURIComponent(repoName)}/${encodeURIComponent(snapshotName)}`
    );
    return response.data;
  }

  async restoreSnapshot(repoName: string, snapshotName: string, body?: Record<string, any>) {
    let response = await this.axios.post(
      `/_snapshot/${encodeURIComponent(repoName)}/${encodeURIComponent(snapshotName)}/_restore`,
      body || {}
    );
    return response.data;
  }

  // ===== Ingest Pipelines =====

  async getPipeline(pipelineId?: string) {
    let path = pipelineId
      ? `/_ingest/pipeline/${encodeURIComponent(pipelineId)}`
      : '/_ingest/pipeline';
    let response = await this.axios.get(path);
    return response.data;
  }

  async putPipeline(pipelineId: string, body: Record<string, any>) {
    let response = await this.axios.put(
      `/_ingest/pipeline/${encodeURIComponent(pipelineId)}`,
      body
    );
    return response.data;
  }

  async deletePipeline(pipelineId: string) {
    let response = await this.axios.delete(
      `/_ingest/pipeline/${encodeURIComponent(pipelineId)}`
    );
    return response.data;
  }

  async simulatePipeline(body: Record<string, any>, pipelineId?: string) {
    let path = pipelineId
      ? `/_ingest/pipeline/${encodeURIComponent(pipelineId)}/_simulate`
      : '/_ingest/pipeline/_simulate';
    let response = await this.axios.post(path, body);
    return response.data;
  }

  // ===== ML / Inference =====

  async createInferenceEndpoint(
    taskType: string,
    inferenceId: string,
    body: Record<string, any>
  ) {
    let response = await this.axios.put(
      `/_inference/${encodeURIComponent(taskType)}/${encodeURIComponent(inferenceId)}`,
      body
    );
    return response.data;
  }

  async updateInferenceEndpoint(
    taskType: string,
    inferenceId: string,
    body: Record<string, any>
  ) {
    let response = await this.axios.put(
      `/_inference/${encodeURIComponent(taskType)}/${encodeURIComponent(inferenceId)}/_update`,
      body
    );
    return response.data;
  }

  async getInferenceEndpoint(taskType?: string, inferenceId?: string) {
    let path = '/_inference';
    if (taskType) path += `/${encodeURIComponent(taskType)}`;
    if (inferenceId) path += `/${encodeURIComponent(inferenceId)}`;
    let response = await this.axios.get(path);
    return response.data;
  }

  async deleteInferenceEndpoint(taskType: string, inferenceId: string) {
    let response = await this.axios.delete(
      `/_inference/${encodeURIComponent(taskType)}/${encodeURIComponent(inferenceId)}`
    );
    return response.data;
  }

  async performInference(taskType: string, inferenceId: string, body: Record<string, any>) {
    let response = await this.axios.post(
      `/_inference/${encodeURIComponent(taskType)}/${encodeURIComponent(inferenceId)}`,
      body
    );
    return response.data;
  }

  // ===== Security =====

  async getUser(username?: string) {
    let path = username
      ? `/_security/user/${encodeURIComponent(username)}`
      : '/_security/user';
    let response = await this.axios.get(path);
    return response.data;
  }

  async putUser(username: string, body: Record<string, any>) {
    let response = await this.axios.put(
      `/_security/user/${encodeURIComponent(username)}`,
      body
    );
    return response.data;
  }

  async deleteUser(username: string) {
    let response = await this.axios.delete(`/_security/user/${encodeURIComponent(username)}`);
    return response.data;
  }

  async getRole(roleName?: string) {
    let path = roleName
      ? `/_security/role/${encodeURIComponent(roleName)}`
      : '/_security/role';
    let response = await this.axios.get(path);
    return response.data;
  }

  async putRole(roleName: string, body: Record<string, any>) {
    let response = await this.axios.put(
      `/_security/role/${encodeURIComponent(roleName)}`,
      body
    );
    return response.data;
  }

  async deleteRole(roleName: string) {
    let response = await this.axios.delete(`/_security/role/${encodeURIComponent(roleName)}`);
    return response.data;
  }

  async createApiKey(body: Record<string, any>) {
    let response = await this.axios.post('/_security/api_key', body);
    return response.data;
  }

  async invalidateApiKey(body: Record<string, any>) {
    let response = await this.axios.delete('/_security/api_key', { data: body });
    return response.data;
  }

  async getApiKey(params?: Record<string, any>) {
    let response = await this.axios.get('/_security/api_key', { params });
    return response.data;
  }

  // ===== Watcher =====

  async putWatch(watchId: string, body: Record<string, any>) {
    let response = await this.axios.put(
      `/_watcher/watch/${encodeURIComponent(watchId)}`,
      body
    );
    return response.data;
  }

  async getWatch(watchId: string) {
    let response = await this.axios.get(`/_watcher/watch/${encodeURIComponent(watchId)}`);
    return response.data;
  }

  async deleteWatch(watchId: string) {
    let response = await this.axios.delete(`/_watcher/watch/${encodeURIComponent(watchId)}`);
    return response.data;
  }

  async executeWatch(watchId?: string, body?: Record<string, any>) {
    let path = watchId
      ? `/_watcher/watch/${encodeURIComponent(watchId)}/_execute`
      : '/_watcher/watch/_execute';
    let response = await this.axios.put(path, body || {});
    return response.data;
  }

  async activateWatch(watchId: string) {
    let response = await this.axios.put(
      `/_watcher/watch/${encodeURIComponent(watchId)}/_activate`
    );
    return response.data;
  }

  async deactivateWatch(watchId: string) {
    let response = await this.axios.put(
      `/_watcher/watch/${encodeURIComponent(watchId)}/_deactivate`
    );
    return response.data;
  }

  async watcherStats() {
    let response = await this.axios.get('/_watcher/stats');
    return response.data;
  }

  async getWatchHistory(watchId?: string, from?: number, size?: number) {
    let body: Record<string, any> = {
      sort: [{ 'trigger_event.triggered_time': { order: 'desc' } }],
      size: size || 50
    };
    if (from !== undefined) {
      body.from = from;
    }
    if (watchId) {
      body.query = { term: { watch_id: watchId } };
    }
    let response = await this.axios.post('/.watcher-history-*/_search', body);
    return response.data;
  }

  // ===== Graph =====

  async graphExplore(index: string, body: Record<string, any>) {
    let response = await this.axios.post(`/${encodeURIComponent(index)}/_graph/explore`, body);
    return response.data;
  }

  // ===== Index Templates =====

  async getIndexTemplate(templateName?: string) {
    let path = templateName
      ? `/_index_template/${encodeURIComponent(templateName)}`
      : '/_index_template';
    let response = await this.axios.get(path);
    return response.data;
  }

  async putIndexTemplate(templateName: string, body: Record<string, any>) {
    let response = await this.axios.put(
      `/_index_template/${encodeURIComponent(templateName)}`,
      body
    );
    return response.data;
  }

  async deleteIndexTemplate(templateName: string) {
    let response = await this.axios.delete(
      `/_index_template/${encodeURIComponent(templateName)}`
    );
    return response.data;
  }

  // ===== Reindex =====

  async reindex(body: Record<string, any>, params?: Record<string, any>) {
    let response = await this.axios.post('/_reindex', body, { params });
    return response.data;
  }

  // ===== Tasks =====

  async getTasks(params?: Record<string, any>) {
    let response = await this.axios.get('/_tasks', { params });
    return response.data;
  }

  async getTask(taskId: string) {
    let response = await this.axios.get(`/_tasks/${encodeURIComponent(taskId)}`);
    return response.data;
  }

  async cancelTask(taskId: string) {
    let response = await this.axios.post(`/_tasks/${encodeURIComponent(taskId)}/_cancel`);
    return response.data;
  }
}

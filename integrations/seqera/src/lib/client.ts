import { createAxios } from 'slates';
import type {
  SeqeraAction,
  SeqeraComputeEnv,
  SeqeraCredentials,
  SeqeraDataset,
  SeqeraLabel,
  SeqeraLaunchRequest,
  SeqeraOrganization,
  SeqeraParticipant,
  SeqeraPipeline,
  SeqeraSecret,
  SeqeraTeam,
  SeqeraWorkflow,
  SeqeraWorkflowTask,
  SeqeraWorkspace
} from './types';

export class SeqeraClient {
  private axios: ReturnType<typeof createAxios>;
  private workspaceId?: string;

  constructor(config: { token: string; baseUrl: string; workspaceId?: string }) {
    this.workspaceId = config.workspaceId;
    this.axios = createAxios({
      baseURL: config.baseUrl,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
  }

  private wsParams(extra?: Record<string, any>): Record<string, any> {
    let params: Record<string, any> = {};
    if (this.workspaceId) {
      params.workspaceId = this.workspaceId;
    }
    if (extra) {
      Object.assign(params, extra);
    }
    return params;
  }

  // ─── User Info ──────────────────────────────────────────────────

  async getUserInfo(): Promise<{ user: Record<string, any> }> {
    let response = await this.axios.get('/user-info');
    return response.data as { user: Record<string, any> };
  }

  // ─── Pipelines ─────────────────────────────────────────────────

  async listPipelines(params?: {
    search?: string;
    max?: number;
    offset?: number;
    sortBy?: string;
    sortDir?: string;
    visibility?: string;
    attributes?: string[];
  }): Promise<{ pipelines: SeqeraPipeline[]; totalSize?: number }> {
    let query = this.wsParams();
    if (params?.search) query.search = params.search;
    if (params?.max) query.max = params.max;
    if (params?.offset) query.offset = params.offset;
    if (params?.sortBy) query.sortBy = params.sortBy;
    if (params?.sortDir) query.sortDir = params.sortDir;
    if (params?.visibility) query.visibility = params.visibility;
    if (params?.attributes) query.attributes = params.attributes;

    let response = await this.axios.get('/pipelines', { params: query });
    let data = response.data as { pipelines?: SeqeraPipeline[]; totalSize?: number };
    return { pipelines: data.pipelines || [], totalSize: data.totalSize };
  }

  async describePipeline(pipelineId: number): Promise<SeqeraPipeline> {
    let response = await this.axios.get(`/pipelines/${pipelineId}`, {
      params: this.wsParams({ attributes: ['labels'] })
    });
    let data = response.data as { pipeline?: SeqeraPipeline };
    return data.pipeline || {};
  }

  async createPipeline(pipeline: {
    name: string;
    description?: string;
    repository: string;
    computeEnvId?: string;
    workDir?: string;
    revision?: string;
    configProfiles?: string[];
    paramsText?: string;
    configText?: string;
    preRunScript?: string;
    postRunScript?: string;
    icon?: string;
    labelIds?: number[];
  }): Promise<SeqeraPipeline> {
    let body: Record<string, any> = {
      name: pipeline.name,
      launch: {
        pipeline: pipeline.repository,
        computeEnvId: pipeline.computeEnvId,
        workDir: pipeline.workDir,
        revision: pipeline.revision,
        configProfiles: pipeline.configProfiles,
        paramsText: pipeline.paramsText,
        configText: pipeline.configText,
        preRunScript: pipeline.preRunScript,
        postRunScript: pipeline.postRunScript
      }
    };
    if (pipeline.description) body.description = pipeline.description;
    if (pipeline.icon) body.icon = pipeline.icon;
    if (pipeline.labelIds) body.labelIds = pipeline.labelIds;

    let response = await this.axios.post('/pipelines', body, {
      params: this.wsParams()
    });
    let data = response.data as { pipeline?: SeqeraPipeline };
    return data.pipeline || {};
  }

  async updatePipeline(
    pipelineId: number,
    updates: {
      name?: string;
      description?: string;
      repository?: string;
      computeEnvId?: string;
      workDir?: string;
      revision?: string;
      configProfiles?: string[];
      paramsText?: string;
      configText?: string;
      preRunScript?: string;
      postRunScript?: string;
      icon?: string;
      labelIds?: number[];
    }
  ): Promise<void> {
    let body: Record<string, any> = {};
    if (updates.name) body.name = updates.name;
    if (updates.description !== undefined) body.description = updates.description;
    if (updates.icon) body.icon = updates.icon;
    if (updates.labelIds) body.labelIds = updates.labelIds;

    let launch: Record<string, any> = {};
    if (updates.repository) launch.pipeline = updates.repository;
    if (updates.computeEnvId) launch.computeEnvId = updates.computeEnvId;
    if (updates.workDir) launch.workDir = updates.workDir;
    if (updates.revision) launch.revision = updates.revision;
    if (updates.configProfiles) launch.configProfiles = updates.configProfiles;
    if (updates.paramsText !== undefined) launch.paramsText = updates.paramsText;
    if (updates.configText !== undefined) launch.configText = updates.configText;
    if (updates.preRunScript !== undefined) launch.preRunScript = updates.preRunScript;
    if (updates.postRunScript !== undefined) launch.postRunScript = updates.postRunScript;

    if (Object.keys(launch).length > 0) {
      body.launch = launch;
    }

    await this.axios.put(`/pipelines/${pipelineId}`, body, {
      params: this.wsParams()
    });
  }

  async deletePipeline(pipelineId: number): Promise<void> {
    await this.axios.delete(`/pipelines/${pipelineId}`, {
      params: this.wsParams()
    });
  }

  // ─── Workflow Runs ─────────────────────────────────────────────

  async listWorkflows(params?: {
    search?: string;
    max?: number;
    offset?: number;
    sortBy?: string;
    sortDir?: string;
    attributes?: string[];
  }): Promise<{ workflows: SeqeraWorkflow[]; totalSize?: number }> {
    let query = this.wsParams();
    if (params?.search) query.search = params.search;
    if (params?.max) query.max = params.max;
    if (params?.offset) query.offset = params.offset;
    if (params?.sortBy) query.sortBy = params.sortBy;
    if (params?.sortDir) query.sortDir = params.sortDir;
    if (params?.attributes) query.attributes = params.attributes;

    let response = await this.axios.get('/workflow', { params: query });
    let data = response.data as { workflows?: SeqeraWorkflow[]; totalSize?: number };
    return { workflows: data.workflows || [], totalSize: data.totalSize };
  }

  async describeWorkflow(
    workflowId: string
  ): Promise<{ workflow: SeqeraWorkflow; progress?: Record<string, any> }> {
    let response = await this.axios.get(`/workflow/${workflowId}`, {
      params: this.wsParams({ attributes: ['labels', 'optimized'] })
    });
    let data = response.data as { workflow?: SeqeraWorkflow; progress?: Record<string, any> };
    return { workflow: data.workflow || {}, progress: data.progress };
  }

  async launchWorkflow(launch: SeqeraLaunchRequest): Promise<{ workflowId: string }> {
    let response = await this.axios.post(
      '/workflow/launch',
      { launch },
      {
        params: this.wsParams()
      }
    );
    let data = response.data as { workflowId?: string };
    return { workflowId: data.workflowId || '' };
  }

  async cancelWorkflow(workflowId: string): Promise<void> {
    await this.axios.post(
      `/workflow/${workflowId}/cancel`,
      {},
      {
        params: this.wsParams()
      }
    );
  }

  async getWorkflowMetrics(workflowId: string): Promise<Record<string, any>[]> {
    let response = await this.axios.get(`/workflow/${workflowId}/metrics`, {
      params: this.wsParams()
    });
    let data = response.data as { metrics?: Record<string, any>[] };
    return data.metrics || [];
  }

  async getWorkflowProgress(workflowId: string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/workflow/${workflowId}/progress`, {
      params: this.wsParams()
    });
    return response.data as Record<string, any>;
  }

  async listWorkflowTasks(
    workflowId: string,
    params?: {
      max?: number;
      offset?: number;
      sortBy?: string;
      sortDir?: string;
      search?: string;
    }
  ): Promise<{ tasks: SeqeraWorkflowTask[]; total?: number }> {
    let query = this.wsParams();
    if (params?.max) query.max = params.max;
    if (params?.offset) query.offset = params.offset;
    if (params?.sortBy) query.sortBy = params.sortBy;
    if (params?.sortDir) query.sortDir = params.sortDir;
    if (params?.search) query.search = params.search;

    let response = await this.axios.get(`/workflow/${workflowId}/tasks`, { params: query });
    let data = response.data as {
      tasks?: Array<{ task?: SeqeraWorkflowTask }>;
      total?: number;
    };
    let tasks = (data.tasks || []).map(t => t.task || {});
    return { tasks, total: data.total };
  }

  async getWorkflowLog(workflowId: string): Promise<string> {
    let response = await this.axios.get(`/workflow/${workflowId}/log`, {
      params: this.wsParams()
    });
    let data = response.data as { log?: string };
    return data.log || '';
  }

  // ─── Compute Environments ─────────────────────────────────────

  async listComputeEnvs(params?: { status?: string }): Promise<SeqeraComputeEnv[]> {
    let query = this.wsParams();
    if (params?.status) query.status = params.status;

    let response = await this.axios.get('/compute-envs', { params: query });
    let data = response.data as { computeEnvs?: SeqeraComputeEnv[] };
    return data.computeEnvs || [];
  }

  async describeComputeEnv(computeEnvId: string): Promise<SeqeraComputeEnv> {
    let response = await this.axios.get(`/compute-envs/${computeEnvId}`, {
      params: this.wsParams()
    });
    let data = response.data as { computeEnv?: SeqeraComputeEnv };
    return data.computeEnv || {};
  }

  async deleteComputeEnv(computeEnvId: string): Promise<void> {
    await this.axios.delete(`/compute-envs/${computeEnvId}`, {
      params: this.wsParams()
    });
  }

  async setPrimaryComputeEnv(computeEnvId: string): Promise<void> {
    await this.axios.post(
      `/compute-envs/${computeEnvId}/primary`,
      {},
      {
        params: this.wsParams()
      }
    );
  }

  // ─── Datasets ─────────────────────────────────────────────────

  async listDatasets(params?: {
    search?: string;
    max?: number;
    offset?: number;
  }): Promise<{ datasets: SeqeraDataset[]; totalSize?: number }> {
    let query = this.wsParams();
    if (params?.search) query.search = params.search;
    if (params?.max) query.max = params.max;
    if (params?.offset) query.offset = params.offset;

    let response = await this.axios.get('/datasets', { params: query });
    let data = response.data as { datasets?: SeqeraDataset[]; totalSize?: number };
    return { datasets: data.datasets || [], totalSize: data.totalSize };
  }

  async describeDataset(datasetId: string): Promise<SeqeraDataset> {
    let response = await this.axios.get(`/datasets/${datasetId}/metadata`, {
      params: this.wsParams()
    });
    let data = response.data as SeqeraDataset;
    return data || {};
  }

  async createDataset(dataset: {
    name: string;
    description?: string;
  }): Promise<SeqeraDataset> {
    let response = await this.axios.post('/datasets', dataset, {
      params: this.wsParams()
    });
    let data = response.data as { dataset?: SeqeraDataset };
    return data.dataset || {};
  }

  async updateDataset(
    datasetId: string,
    updates: {
      name?: string;
      description?: string;
    }
  ): Promise<void> {
    await this.axios.put(`/datasets/${datasetId}`, updates, {
      params: this.wsParams()
    });
  }

  async deleteDataset(datasetId: string): Promise<void> {
    await this.axios.delete(`/datasets/${datasetId}`, {
      params: this.wsParams()
    });
  }

  async uploadDatasetVersion(
    datasetId: string,
    content: string,
    mediaType?: string
  ): Promise<void> {
    let headers: Record<string, string> = {};
    if (mediaType) {
      headers['Content-Type'] = mediaType;
    } else {
      headers['Content-Type'] = 'text/csv';
    }

    await this.axios.post(`/datasets/${datasetId}/upload`, content, {
      params: this.wsParams(),
      headers
    });
  }

  async listDatasetVersions(datasetId: string): Promise<Record<string, any>[]> {
    let response = await this.axios.get(`/datasets/${datasetId}/versions`, {
      params: this.wsParams()
    });
    let data = response.data as { versions?: Record<string, any>[] };
    return data.versions || [];
  }

  // ─── Credentials ──────────────────────────────────────────────

  async listCredentials(params?: { platformId?: string }): Promise<SeqeraCredentials[]> {
    let query = this.wsParams();
    if (params?.platformId) query.platformId = params.platformId;

    let response = await this.axios.get('/credentials', { params: query });
    let data = response.data as { credentials?: SeqeraCredentials[] };
    return data.credentials || [];
  }

  async describeCredentials(credentialsId: string): Promise<SeqeraCredentials> {
    let response = await this.axios.get(`/credentials/${credentialsId}`, {
      params: this.wsParams()
    });
    let data = response.data as { credentials?: SeqeraCredentials };
    return data.credentials || {};
  }

  async deleteCredentials(credentialsId: string): Promise<void> {
    await this.axios.delete(`/credentials/${credentialsId}`, {
      params: this.wsParams()
    });
  }

  // ─── Secrets ──────────────────────────────────────────────────

  async listSecrets(): Promise<SeqeraSecret[]> {
    let response = await this.axios.get('/pipeline-secrets', {
      params: this.wsParams()
    });
    let data = response.data as { pipelineSecrets?: SeqeraSecret[] };
    return data.pipelineSecrets || [];
  }

  async createSecret(secret: { name: string; value: string }): Promise<SeqeraSecret> {
    let response = await this.axios.post('/pipeline-secrets', secret, {
      params: this.wsParams()
    });
    let data = response.data as { secretId?: number };
    return { id: data.secretId, name: secret.name };
  }

  async updateSecret(
    secretId: number,
    updates: { name?: string; value?: string }
  ): Promise<void> {
    await this.axios.put(`/pipeline-secrets/${secretId}`, updates, {
      params: this.wsParams()
    });
  }

  async deleteSecret(secretId: number): Promise<void> {
    await this.axios.delete(`/pipeline-secrets/${secretId}`, {
      params: this.wsParams()
    });
  }

  // ─── Organizations ────────────────────────────────────────────

  async listOrganizations(): Promise<SeqeraOrganization[]> {
    let response = await this.axios.get('/orgs');
    let data = response.data as { organizations?: SeqeraOrganization[] };
    return data.organizations || [];
  }

  async describeOrganization(orgId: number): Promise<SeqeraOrganization> {
    let response = await this.axios.get(`/orgs/${orgId}`);
    let data = response.data as { organization?: SeqeraOrganization };
    return data.organization || {};
  }

  // ─── Workspaces ───────────────────────────────────────────────

  async listWorkspaces(orgId: number): Promise<SeqeraWorkspace[]> {
    let response = await this.axios.get(`/orgs/${orgId}/workspaces`);
    let data = response.data as { workspaces?: SeqeraWorkspace[] };
    return data.workspaces || [];
  }

  async describeWorkspace(orgId: number, workspaceId: number): Promise<SeqeraWorkspace> {
    let response = await this.axios.get(`/orgs/${orgId}/workspaces/${workspaceId}`);
    let data = response.data as { workspace?: SeqeraWorkspace };
    return data.workspace || {};
  }

  // ─── Teams ────────────────────────────────────────────────────

  async listTeams(orgId: number): Promise<SeqeraTeam[]> {
    let response = await this.axios.get(`/orgs/${orgId}/teams`);
    let data = response.data as { teams?: SeqeraTeam[] };
    return data.teams || [];
  }

  // ─── Actions ──────────────────────────────────────────────────

  async listActions(): Promise<SeqeraAction[]> {
    let response = await this.axios.get('/actions', {
      params: this.wsParams()
    });
    let data = response.data as { actions?: SeqeraAction[] };
    return data.actions || [];
  }

  async describeAction(actionId: string): Promise<SeqeraAction> {
    let response = await this.axios.get(`/actions/${actionId}`, {
      params: this.wsParams()
    });
    let data = response.data as { action?: SeqeraAction };
    return data.action || {};
  }

  async createAction(action: {
    name: string;
    source: string;
    launch: SeqeraLaunchRequest;
  }): Promise<SeqeraAction> {
    let response = await this.axios.post('/actions', action, {
      params: this.wsParams()
    });
    let data = response.data as { action?: SeqeraAction };
    return data.action || {};
  }

  async deleteAction(actionId: string): Promise<void> {
    await this.axios.delete(`/actions/${actionId}`, {
      params: this.wsParams()
    });
  }

  async triggerAction(actionId: string, params?: Record<string, any>): Promise<string> {
    let response = await this.axios.post(`/actions/${actionId}/launch`, params || {}, {
      params: this.wsParams()
    });
    let data = response.data as { workflowId?: string };
    return data.workflowId || '';
  }

  async pauseAction(actionId: string): Promise<void> {
    await this.axios.post(
      `/actions/${actionId}/pause`,
      {},
      {
        params: this.wsParams()
      }
    );
  }

  // ─── Labels ───────────────────────────────────────────────────

  async listLabels(): Promise<SeqeraLabel[]> {
    let response = await this.axios.get('/labels', {
      params: this.wsParams()
    });
    let data = response.data as { labels?: SeqeraLabel[] };
    return data.labels || [];
  }

  async createLabel(label: {
    name: string;
    value?: string;
    resource?: string;
    isDefault?: boolean;
  }): Promise<SeqeraLabel> {
    let response = await this.axios.post('/labels', label, {
      params: this.wsParams()
    });
    let data = response.data as SeqeraLabel;
    return data || {};
  }

  async updateLabel(
    labelId: number,
    updates: { name?: string; value?: string; isDefault?: boolean }
  ): Promise<void> {
    await this.axios.put(`/labels/${labelId}`, updates, {
      params: this.wsParams()
    });
  }

  async deleteLabel(labelId: number): Promise<void> {
    await this.axios.delete(`/labels/${labelId}`, {
      params: this.wsParams()
    });
  }

  // ─── Participants ─────────────────────────────────────────────

  async listParticipants(): Promise<SeqeraParticipant[]> {
    let response = await this.axios.get('/participants', {
      params: this.wsParams()
    });
    let data = response.data as { participants?: SeqeraParticipant[] };
    return data.participants || [];
  }

  // ─── Tokens ───────────────────────────────────────────────────

  async listTokens(): Promise<Record<string, any>[]> {
    let response = await this.axios.get('/user-api-tokens');
    let data = response.data as { tokens?: Record<string, any>[] };
    return data.tokens || [];
  }

  async createToken(name: string): Promise<Record<string, any>> {
    let response = await this.axios.post('/user-api-tokens', { name });
    return response.data as Record<string, any>;
  }

  async deleteToken(tokenId: number): Promise<void> {
    await this.axios.delete(`/user-api-tokens/${tokenId}`);
  }
}

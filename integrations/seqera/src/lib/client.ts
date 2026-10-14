import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';
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
  SeqeraUser,
  SeqeraWorkflow,
  SeqeraWorkflowTask,
  SeqeraWorkspace
} from './types';

export class SeqeraClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;
  private workspaceId?: string;

  constructor(config: { token: string; baseUrl?: unknown; workspaceId?: string }) {
    this.workspaceId = config.workspaceId;
    this.axios = createAuthenticatedAxios({
      baseURL:
        typeof config.baseUrl === 'string' ? config.baseUrl : 'https://api.cloud.seqera.io',
      timeout: 30000,
      authHeader: { value: `Bearer ${config.token}` },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Seqera',
          reason: 'seqera_api_error'
        }),
      headers: {
        Accept: 'application/json'
      }
    });
  }

  private wsParams(extra?: Record<string, unknown>): Record<string, unknown> {
    let params: Record<string, unknown> = {};
    if (this.workspaceId) {
      params.workspaceId = this.workspaceId;
    }
    if (extra) {
      Object.assign(params, extra);
    }
    return params;
  }

  // ─── User Info ──────────────────────────────────────────────────

  async getUserInfo(): Promise<{
    user: SeqeraUser & { id: number };
    defaultWorkspaceId?: number | null;
  }> {
    let response = await this.axios.get('/user-info');
    let data = response.data as { user?: SeqeraUser; defaultWorkspaceId?: number | null };
    if (!data.user?.id)
      throw createApiServiceError(
        'Seqera returned no current user identity. Check the access token and API URL.'
      );
    return {
      user: { ...data.user, id: data.user.id },
      defaultWorkspaceId: data.defaultWorkspaceId
    };
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
    if (params?.sortBy) {
      let sortBy = params.sortBy.toUpperCase();
      if (sortBy === 'LASTUPDATED') sortBy = 'MODIFIED';
      if (!['NAME', 'CREATED', 'MODIFIED'].includes(sortBy)) {
        throw createApiServiceError(
          'Pipeline sortBy must be NAME, CREATED, MODIFIED, or lastUpdated.'
        );
      }
      query.sortBy = sortBy;
    }
    if (params?.sortDir)
      query.sortDir = params.sortDir.toLowerCase() === 'asc' ? 'ASCENDING' : 'DESCENDING';
    if (params?.visibility) query.visibility = params.visibility;
    if (params?.attributes) query.attributes = params.attributes.join(',');

    let response = await this.axios.get('/pipelines', { params: query });
    let data = response.data as { pipelines?: SeqeraPipeline[]; totalSize?: number };
    return {
      pipelines: (data.pipelines || []).map(pipeline => ({
        ...pipeline,
        computeEnvId: pipeline.computeEnv?.id ?? pipeline.computeEnvId
      })),
      totalSize: data.totalSize
    };
  }

  async describePipeline(pipelineId: number): Promise<SeqeraPipeline> {
    let response = await this.axios.get(`/pipelines/${pipelineId}`, {
      params: this.wsParams({ attributes: 'labels,computeEnv' })
    });
    let data = response.data as { pipeline?: SeqeraPipeline };
    if (!data.pipeline?.pipelineId)
      throw createApiServiceError('Seqera returned no pipeline details.');
    let launchResponse = await this.axios.get(`/pipelines/${pipelineId}/launch`, {
      params: this.wsParams()
    });
    let { launch } = launchResponse.data as {
      launch?: Omit<SeqeraPipeline, 'repository'> & {
        pipeline?: string;
        computeEnv?: { id?: string };
      };
    };
    return {
      ...data.pipeline,
      ...launch,
      repository: data.pipeline.repository ?? launch?.pipeline,
      computeEnvId: launch?.computeEnv?.id ?? launch?.computeEnvId,
      lastUpdated: data.pipeline.lastUpdated
    };
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
    if (!data.pipeline?.pipelineId)
      throw createApiServiceError('Seqera did not return the created pipeline ID.');
    return data.pipeline;
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
    if (updates.name !== undefined) body.name = updates.name;
    if (updates.description !== undefined) body.description = updates.description;
    if (updates.icon !== undefined) body.icon = updates.icon;
    body.labelIds =
      updates.labelIds ??
      (await this.describePipeline(pipelineId)).labels?.flatMap(label =>
        label.id === undefined ? [] : [label.id]
      ) ??
      [];

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
    if (params?.sortBy || params?.sortDir) {
      throw createApiServiceError(
        'Seqera workflow listing does not support sorting. Omit sortBy and sortDirection; use search to filter runs.'
      );
    }
    if (params?.attributes) query.attributes = params.attributes.join(',');
    query.includeTotalSize = true;

    let response = await this.axios.get('/workflow', { params: query });
    let data = response.data as {
      workflows?: Array<{ workflow?: SeqeraWorkflow }>;
      totalSize?: number;
    };
    return {
      workflows: (data.workflows || []).flatMap(entry =>
        entry.workflow ? [entry.workflow] : []
      ),
      totalSize: data.totalSize
    };
  }

  async describeWorkflow(
    workflowId: string
  ): Promise<{ workflow: SeqeraWorkflow; progress?: Record<string, any> }> {
    let response = await this.axios.get(`/workflow/${encodeURIComponent(workflowId)}`, {
      params: this.wsParams({ attributes: 'labels,optimized' })
    });
    let data = response.data as { workflow?: SeqeraWorkflow; progress?: Record<string, any> };
    if (!data.workflow?.id)
      throw createApiServiceError('Seqera returned no workflow details.');
    return { workflow: data.workflow, progress: data.progress };
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
    if (!data.workflowId)
      throw createApiServiceError('Seqera did not return the launched workflow ID.');
    return { workflowId: data.workflowId };
  }

  async cancelWorkflow(workflowId: string): Promise<void> {
    await this.axios.post(
      `/workflow/${encodeURIComponent(workflowId)}/cancel`,
      {},
      {
        params: this.wsParams()
      }
    );
  }

  async getWorkflowMetrics(workflowId: string): Promise<Record<string, any>[]> {
    let response = await this.axios.get(
      `/workflow/${encodeURIComponent(workflowId)}/metrics`,
      {
        params: this.wsParams()
      }
    );
    let data = response.data as { metrics?: Record<string, any>[] };
    return data.metrics || [];
  }

  async getWorkflowProgress(workflowId: string): Promise<Record<string, any>> {
    let response = await this.axios.get(
      `/workflow/${encodeURIComponent(workflowId)}/progress`,
      {
        params: this.wsParams()
      }
    );
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
      process?: string;
    }
  ): Promise<{ tasks: SeqeraWorkflowTask[]; total?: number }> {
    let query = this.wsParams();
    if (params?.max) query.max = params.max;
    if (params?.offset) query.offset = params.offset;
    if (params?.sortBy) query.sortBy = params.sortBy;
    if (params?.sortDir) query.sortDir = params.sortDir;
    if (params?.search) query.search = params.search;
    if (params?.process) query.process = params.process;

    let response = await this.axios.get(`/workflow/${encodeURIComponent(workflowId)}/tasks`, {
      params: query
    });
    let data = response.data as {
      tasks?: Array<{ task?: SeqeraWorkflowTask }>;
      total?: number;
    };
    let tasks = (data.tasks || []).map(t => t.task || {});
    return { tasks, total: data.total };
  }

  async getWorkflowLog(workflowId: string): Promise<string> {
    let response = await this.axios.get(`/workflow/${encodeURIComponent(workflowId)}/log`, {
      params: this.wsParams()
    });
    let data = response.data as { log?: { entries?: string[] } };
    return (data.log?.entries || []).join('\n');
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
    let response = await this.axios.get(`/compute-envs/${encodeURIComponent(computeEnvId)}`, {
      params: this.wsParams()
    });
    let data = response.data as { computeEnv?: SeqeraComputeEnv };
    if (!data.computeEnv?.id)
      throw createApiServiceError('Seqera returned no compute environment details.');
    return {
      ...data.computeEnv,
      workDir: data.computeEnv.config?.workDir ?? data.computeEnv.workDir
    };
  }

  async deleteComputeEnv(computeEnvId: string): Promise<void> {
    await this.axios.delete(`/compute-envs/${encodeURIComponent(computeEnvId)}`, {
      params: this.wsParams()
    });
  }

  async setPrimaryComputeEnv(computeEnvId: string): Promise<void> {
    await this.axios.post(
      `/compute-envs/${encodeURIComponent(computeEnvId)}/primary`,
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
    let response = await this.axios.get(
      `/datasets/${encodeURIComponent(datasetId)}/metadata`,
      {
        params: this.wsParams()
      }
    );
    let data = response.data as { dataset?: SeqeraDataset };
    if (!data.dataset?.id) throw createApiServiceError('Seqera returned no dataset metadata.');
    return data.dataset;
  }

  async createDataset(dataset: {
    name: string;
    description?: string;
  }): Promise<SeqeraDataset> {
    let response = await this.axios.post('/datasets', dataset, {
      params: this.wsParams()
    });
    let data = response.data as { dataset?: SeqeraDataset };
    if (!data.dataset?.id)
      throw createApiServiceError('Seqera did not return the created dataset ID.');
    return data.dataset;
  }

  async updateDataset(
    datasetId: string,
    updates: {
      name?: string;
      description?: string;
    }
  ): Promise<void> {
    await this.axios.put(`/datasets/${encodeURIComponent(datasetId)}`, updates, {
      params: this.wsParams()
    });
  }

  async deleteDataset(datasetId: string): Promise<void> {
    await this.axios.delete(`/datasets/${encodeURIComponent(datasetId)}`, {
      params: this.wsParams()
    });
  }

  async uploadDatasetVersion(
    datasetId: string,
    content: string,
    mediaType?: string
  ): Promise<void> {
    let form = new FormData();
    form.append(
      'file',
      new Blob([content], { type: mediaType ?? 'text/csv' }),
      mediaType === 'text/tab-separated-values' ? 'samplesheet.tsv' : 'samplesheet.csv'
    );
    await this.axios.post(`/datasets/${encodeURIComponent(datasetId)}/upload`, form, {
      params: this.wsParams(),
      headers: { 'Content-Type': undefined }
    });
  }

  async listDatasetVersions(datasetId: string): Promise<Record<string, any>[]> {
    let response = await this.axios.get(
      `/datasets/${encodeURIComponent(datasetId)}/versions`,
      {
        params: this.wsParams()
      }
    );
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
    let response = await this.axios.get(`/credentials/${encodeURIComponent(credentialsId)}`, {
      params: this.wsParams()
    });
    let data = response.data as { credentials?: SeqeraCredentials };
    return data.credentials || {};
  }

  async deleteCredentials(credentialsId: string): Promise<void> {
    await this.axios.delete(`/credentials/${encodeURIComponent(credentialsId)}`, {
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
    if (data.secretId === undefined)
      throw createApiServiceError('Seqera did not return the created secret ID.');
    return { id: data.secretId, name: secret.name };
  }

  async updateSecret(
    secretId: number,
    updates: { name?: string; value?: string }
  ): Promise<void> {
    if (updates.name !== undefined)
      throw createApiServiceError(
        'Seqera does not support renaming pipeline secrets. Create a new secret with the desired name instead.'
      );
    if (updates.value === undefined)
      throw createApiServiceError('value is required to update a pipeline secret.');
    await this.axios.put(
      `/pipeline-secrets/${secretId}`,
      { value: updates.value },
      {
        params: this.wsParams()
      }
    );
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
    let response = await this.axios.get(`/actions/${encodeURIComponent(actionId)}`, {
      params: this.wsParams()
    });
    let data = response.data as {
      action?: Omit<SeqeraAction, 'pipeline'> & {
        launch?: { pipeline?: string };
        hookUrl?: string;
      };
    };
    return {
      ...data.action,
      pipeline: data.action?.launch?.pipeline,
      endpoint: data.action?.hookUrl
    };
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
    await this.axios.delete(`/actions/${encodeURIComponent(actionId)}`, {
      params: this.wsParams()
    });
  }

  async triggerAction(actionId: string, params?: Record<string, any>): Promise<string> {
    let response = await this.axios.post(
      `/actions/${encodeURIComponent(actionId)}/launch`,
      { params: params || {} },
      {
        params: this.wsParams()
      }
    );
    let data = response.data as { workflowId?: string };
    if (!data.workflowId)
      throw createApiServiceError(
        'Seqera did not return the workflow ID after triggering the action.'
      );
    return data.workflowId;
  }

  async pauseAction(actionId: string): Promise<void> {
    await this.axios.post(
      `/actions/${encodeURIComponent(actionId)}/pause`,
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
    resource?: boolean;
    isDefault?: boolean;
  }): Promise<SeqeraLabel> {
    let response = await this.axios.post(
      '/labels',
      { ...label, resource: label.resource ?? label.value !== undefined },
      {
        params: this.wsParams()
      }
    );
    let data = response.data as SeqeraLabel;
    if (data.id === undefined)
      throw createApiServiceError('Seqera did not return the created label ID.');
    return data;
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

  async listParticipants(
    orgId?: number,
    params?: { max?: number; offset?: number; search?: string }
  ): Promise<{ participants: SeqeraParticipant[]; totalSize?: number }> {
    if (!this.workspaceId)
      throw createApiServiceError(
        'workspaceId is required to list participants. Call list_organizations and list_workspaces first.'
      );
    if (orgId === undefined) {
      for (let organization of await this.listOrganizations()) {
        if (organization.orgId === undefined) continue;
        let workspaces = await this.listWorkspaces(organization.orgId);
        if (workspaces.some(workspace => String(workspace.id) === this.workspaceId)) {
          orgId = organization.orgId;
          break;
        }
      }
    }
    if (orgId === undefined)
      throw createApiServiceError(
        'No organization was found for this workspace. Pass orgId from list_organizations and workspaceId from list_workspaces.'
      );
    let response = await this.axios.get(
      `/orgs/${orgId}/workspaces/${encodeURIComponent(this.workspaceId)}/participants`,
      {
        params: { max: params?.max ?? 50, offset: params?.offset ?? 0, search: params?.search }
      }
    );
    let data = response.data as { participants?: SeqeraParticipant[]; totalSize?: number };
    return {
      participants: (data.participants || []).map(participant => ({
        ...participant,
        role: participant.wspRole
      })),
      totalSize: data.totalSize
    };
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

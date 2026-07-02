import { createAxios } from '@slates/provider';
import { herokuApiError } from './errors';
import type {
  HerokuAccount,
  HerokuAddon,
  HerokuAddonAttachment,
  HerokuApp,
  HerokuBuild,
  HerokuBuildpackInstallation,
  HerokuCollaborator,
  HerokuDomain,
  HerokuDyno,
  HerokuFormation,
  HerokuLogDrain,
  HerokuLogSession,
  HerokuPipeline,
  HerokuPipelineCoupling,
  HerokuPipelinePromotion,
  HerokuPipelinePromotionTarget,
  HerokuRelease,
  HerokuSniEndpoint,
  HerokuWebhook
} from './types';

let HEROKU_HEADERS = {
  Accept: 'application/vnd.heroku+json; version=3',
  'Content-Type': 'application/json'
};

let HEROKU_WEBHOOK_HEADERS = {
  Accept: 'application/vnd.heroku+json; version=3.webhooks',
  'Content-Type': 'application/json'
};

let mapApp = (data: any): HerokuApp => ({
  appId: data.id,
  name: data.name,
  region: data.region?.name || '',
  stack: data.stack?.name || '',
  webUrl: data.web_url || '',
  gitUrl: data.git_url || '',
  maintenance: data.maintenance || false,
  createdAt: data.created_at || '',
  updatedAt: data.updated_at || '',
  releasedAt: data.released_at || null,
  buildStack: data.build_stack?.name || data.stack?.name || '',
  ownerEmail: data.owner?.email || '',
  ownerId: data.owner?.id || '',
  teamName: data.team?.name || null
});

let mapDyno = (data: any): HerokuDyno => ({
  dynoId: data.id,
  appName: data.app?.name || '',
  command: data.command || '',
  name: data.name || '',
  size: data.size || '',
  state: data.state || '',
  type: data.type || '',
  createdAt: data.created_at || '',
  updatedAt: data.updated_at || '',
  attachUrl: data.attach_url || null
});

let mapFormation = (data: any): HerokuFormation => ({
  formationId: data.id,
  appName: data.app?.name || '',
  command: data.command || '',
  type: data.type || '',
  quantity: data.quantity || 0,
  size: data.dyno_size?.name || data.size || '',
  createdAt: data.created_at || '',
  updatedAt: data.updated_at || ''
});

let mapAddon = (data: any): HerokuAddon => ({
  addonId: data.id,
  appId: data.app?.id || '',
  appName: data.app?.name || '',
  name: data.name || '',
  planName: data.plan?.name || '',
  planId: data.plan?.id || '',
  serviceName: data.addon_service?.name || '',
  state: data.state || '',
  webUrl: data.web_url || null,
  createdAt: data.created_at || '',
  updatedAt: data.updated_at || ''
});

let mapAddonAttachment = (data: any): HerokuAddonAttachment => ({
  attachmentId: data.id,
  addonId: data.addon?.id || '',
  addonName: data.addon?.name || '',
  appId: data.app?.id || '',
  appName: data.app?.name || '',
  name: data.name || '',
  namespace: data.namespace || null,
  createdAt: data.created_at || '',
  updatedAt: data.updated_at || ''
});

let mapRelease = (data: any): HerokuRelease => ({
  releaseId: data.id,
  appName: data.app?.name || '',
  version: data.version || 0,
  description: data.description || '',
  status: data.status || '',
  current: data.current || false,
  createdAt: data.created_at || '',
  updatedAt: data.updated_at || '',
  userEmail: data.user?.email || '',
  userId: data.user?.id || '',
  slugId: data.slug?.id || null
});

let mapBuild = (data: any): HerokuBuild => ({
  buildId: data.id,
  appId: data.app?.id || '',
  status: data.status || '',
  outputStreamUrl: data.output_stream_url || null,
  sourceUrl: data.source_blob?.url || null,
  sourceVersion: data.source_blob?.version || null,
  createdAt: data.created_at || '',
  updatedAt: data.updated_at || '',
  userEmail: data.user?.email || '',
  userId: data.user?.id || '',
  slugId: data.slug?.id || null
});

let mapBuildpackInstallation = (data: any): HerokuBuildpackInstallation => ({
  ordinal: data.ordinal ?? 0,
  buildpackName: data.buildpack?.name || '',
  buildpackUrl: data.buildpack?.url || ''
});

let mapDomain = (data: any): HerokuDomain => ({
  domainId: data.id,
  appName: data.app?.name || '',
  hostname: data.hostname || '',
  kind: data.kind || '',
  cname: data.cname || null,
  status: data.status || '',
  createdAt: data.created_at || '',
  updatedAt: data.updated_at || ''
});

let mapCollaborator = (data: any): HerokuCollaborator => ({
  collaboratorId: data.id,
  appName: data.app?.name || '',
  userEmail: data.user?.email || '',
  userId: data.user?.id || '',
  role: data.role || null,
  createdAt: data.created_at || '',
  updatedAt: data.updated_at || ''
});

let mapPipeline = (data: any): HerokuPipeline => ({
  pipelineId: data.id,
  name: data.name || '',
  createdAt: data.created_at || '',
  updatedAt: data.updated_at || '',
  ownerId: data.owner?.id || null,
  ownerType: data.owner?.type || null
});

let mapPipelineCoupling = (data: any): HerokuPipelineCoupling => ({
  couplingId: data.id,
  pipelineId: data.pipeline?.id || '',
  appId: data.app?.id || '',
  appName: data.app?.name || '',
  stage: data.stage || '',
  createdAt: data.created_at || '',
  updatedAt: data.updated_at || ''
});

let mapPipelinePromotion = (data: any): HerokuPipelinePromotion => ({
  promotionId: data.id,
  pipelineId: data.pipeline?.id || '',
  sourceAppId: data.source?.app?.id || '',
  sourceReleaseId: data.source?.release?.id || '',
  status: data.status || '',
  createdAt: data.created_at || '',
  updatedAt: data.updated_at || null
});

let mapPipelinePromotionTarget = (data: any): HerokuPipelinePromotionTarget => ({
  targetId: data.id,
  appId: data.app?.id || '',
  promotionId: data.pipeline_promotion?.id || '',
  releaseId: data.release?.id || null,
  status: data.status || '',
  errorMessage: data.error_message || null
});

let mapLogDrain = (data: any): HerokuLogDrain => ({
  drainId: data.id,
  appName: data.app?.name || '',
  url: data.url || '',
  token: data.token || '',
  createdAt: data.created_at || '',
  updatedAt: data.updated_at || ''
});

let mapLogSession = (data: any): HerokuLogSession => ({
  logSessionId: data.id,
  logplexUrl: data.logplex_url || '',
  createdAt: data.created_at || '',
  updatedAt: data.updated_at || ''
});

let mapSniEndpoint = (data: any): HerokuSniEndpoint => ({
  endpointId: data.id,
  appName: data.app?.name || '',
  name: data.name || '',
  certificateChain: data.certificate_chain || '',
  createdAt: data.created_at || '',
  updatedAt: data.updated_at || '',
  domains: data.domains || []
});

let mapWebhook = (data: any): HerokuWebhook => ({
  webhookId: data.id,
  appId: data.app?.id || '',
  include: data.include || [],
  level: data.level || '',
  url: data.url || '',
  createdAt: data.created_at || '',
  updatedAt: data.updated_at || ''
});

let mapAccount = (data: any): HerokuAccount => ({
  accountId: data.id,
  email: data.email || '',
  name: data.name || null,
  defaultOrganization: data.default_organization?.name || null,
  verified: data.verified || false,
  twoFactorAuthentication: data.two_factor_authentication || false,
  createdAt: data.created_at || '',
  updatedAt: data.updated_at || ''
});

export class Client {
  private axios;

  constructor(private config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.heroku.com',
      headers: {
        Authorization: `Bearer ${config.token}`,
        ...HEROKU_HEADERS
      }
    });

    this.axios.interceptors.response.use(
      (response: any) => response,
      (error: unknown) => Promise.reject(herokuApiError(error))
    );
  }

  // ============ Account ============

  async getAccount(): Promise<HerokuAccount> {
    let response = await this.axios.get('/account');
    return mapAccount(response.data);
  }

  // ============ Apps ============

  async listApps(): Promise<HerokuApp[]> {
    let response = await this.axios.get('/apps');
    return (response.data as any[]).map(mapApp);
  }

  async getApp(appIdOrName: string): Promise<HerokuApp> {
    let response = await this.axios.get(`/apps/${encodeURIComponent(appIdOrName)}`);
    return mapApp(response.data);
  }

  async createApp(params: {
    name?: string;
    region?: string;
    stack?: string;
  }): Promise<HerokuApp> {
    let body: any = {};
    if (params.name) body.name = params.name;
    if (params.region) body.region = params.region;
    if (params.stack) body.stack = params.stack;

    let response = await this.axios.post('/apps', body);
    return mapApp(response.data);
  }

  async updateApp(
    appIdOrName: string,
    params: {
      name?: string;
      maintenance?: boolean;
      buildStack?: string;
    }
  ): Promise<HerokuApp> {
    let body: any = {};
    if (params.name !== undefined) body.name = params.name;
    if (params.maintenance !== undefined) body.maintenance = params.maintenance;
    if (params.buildStack !== undefined) body.build_stack = params.buildStack;

    let response = await this.axios.patch(`/apps/${encodeURIComponent(appIdOrName)}`, body);
    return mapApp(response.data);
  }

  async deleteApp(appIdOrName: string): Promise<void> {
    await this.axios.delete(`/apps/${encodeURIComponent(appIdOrName)}`);
  }

  // ============ Dynos ============

  async listDynos(appIdOrName: string): Promise<HerokuDyno[]> {
    let response = await this.axios.get(`/apps/${encodeURIComponent(appIdOrName)}/dynos`);
    return (response.data as any[]).map(mapDyno);
  }

  async getDyno(appIdOrName: string, dynoIdOrName: string): Promise<HerokuDyno> {
    let response = await this.axios.get(
      `/apps/${encodeURIComponent(appIdOrName)}/dynos/${encodeURIComponent(dynoIdOrName)}`
    );
    return mapDyno(response.data);
  }

  async runDyno(
    appIdOrName: string,
    params: {
      command: string;
      size?: string;
      type?: string;
      env?: Record<string, string>;
      attach?: boolean;
      timeToLive?: number;
    }
  ): Promise<HerokuDyno> {
    let body: any = { command: params.command };
    if (params.size) body.size = params.size;
    if (params.type) body.type = params.type;
    if (params.env) body.env = params.env;
    if (params.attach !== undefined) body.attach = params.attach;
    if (params.timeToLive !== undefined) body.time_to_live = params.timeToLive;

    let response = await this.axios.post(
      `/apps/${encodeURIComponent(appIdOrName)}/dynos`,
      body
    );
    return mapDyno(response.data);
  }

  async restartDyno(appIdOrName: string, dynoIdOrName: string): Promise<void> {
    await this.axios.delete(
      `/apps/${encodeURIComponent(appIdOrName)}/dynos/${encodeURIComponent(dynoIdOrName)}`
    );
  }

  async restartAllDynos(appIdOrName: string): Promise<void> {
    await this.axios.delete(`/apps/${encodeURIComponent(appIdOrName)}/dynos`);
  }

  // ============ Formation ============

  async listFormation(appIdOrName: string): Promise<HerokuFormation[]> {
    let response = await this.axios.get(`/apps/${encodeURIComponent(appIdOrName)}/formation`);
    return (response.data as any[]).map(mapFormation);
  }

  async updateFormation(
    appIdOrName: string,
    processType: string,
    params: {
      quantity?: number;
      size?: string;
    }
  ): Promise<HerokuFormation> {
    let body: any = {};
    if (params.quantity !== undefined) body.quantity = params.quantity;
    if (params.size !== undefined) body.dyno_size = { name: params.size };

    let response = await this.axios.patch(
      `/apps/${encodeURIComponent(appIdOrName)}/formation/${encodeURIComponent(processType)}`,
      body
    );
    return mapFormation(response.data);
  }

  async batchUpdateFormation(
    appIdOrName: string,
    updates: Array<{
      type: string;
      quantity?: number;
      size?: string;
    }>
  ): Promise<HerokuFormation[]> {
    let body = {
      updates: updates.map(u => {
        let entry: any = { type: u.type };
        if (u.quantity !== undefined) entry.quantity = u.quantity;
        if (u.size !== undefined) entry.dyno_size = { name: u.size };
        return entry;
      })
    };

    let response = await this.axios.patch(
      `/apps/${encodeURIComponent(appIdOrName)}/formation`,
      body
    );
    return (response.data as any[]).map(mapFormation);
  }

  // ============ Add-ons ============

  async listAddons(appIdOrName?: string): Promise<HerokuAddon[]> {
    let url = appIdOrName ? `/apps/${encodeURIComponent(appIdOrName)}/addons` : '/addons';
    let response = await this.axios.get(url);
    return (response.data as any[]).map(mapAddon);
  }

  async getAddon(addonIdOrName: string): Promise<HerokuAddon> {
    let response = await this.axios.get(`/addons/${encodeURIComponent(addonIdOrName)}`);
    return mapAddon(response.data);
  }

  async createAddon(
    appIdOrName: string,
    params: {
      plan: string;
      name?: string;
      config?: Record<string, string>;
      attachment?: { name?: string };
    }
  ): Promise<HerokuAddon> {
    let body: any = { plan: params.plan };
    if (params.name) body.name = params.name;
    if (params.config) body.config = params.config;
    if (params.attachment) body.attachment = params.attachment;

    let response = await this.axios.post(
      `/apps/${encodeURIComponent(appIdOrName)}/addons`,
      body
    );
    return mapAddon(response.data);
  }

  async updateAddon(
    addonIdOrName: string,
    params: {
      plan?: string;
      name?: string;
    }
  ): Promise<HerokuAddon> {
    let body: any = {};
    if (params.plan) body.plan = params.plan;
    if (params.name) body.name = params.name;

    let response = await this.axios.patch(
      `/addons/${encodeURIComponent(addonIdOrName)}`,
      body
    );
    return mapAddon(response.data);
  }

  async deleteAddon(appIdOrName: string, addonIdOrName: string): Promise<void> {
    await this.axios.delete(
      `/apps/${encodeURIComponent(appIdOrName)}/addons/${encodeURIComponent(addonIdOrName)}`
    );
  }

  // ============ Add-on Attachments ============

  async listAddonAttachments(appIdOrName: string): Promise<HerokuAddonAttachment[]> {
    let response = await this.axios.get(
      `/apps/${encodeURIComponent(appIdOrName)}/addon-attachments`
    );
    return (response.data as any[]).map(mapAddonAttachment);
  }

  async createAddonAttachment(params: {
    addonIdOrName: string;
    appIdOrName: string;
    name?: string;
    namespace?: string;
  }): Promise<HerokuAddonAttachment> {
    let body: any = {
      addon: params.addonIdOrName,
      app: params.appIdOrName
    };
    if (params.name) body.name = params.name;
    if (params.namespace) body.namespace = params.namespace;

    let response = await this.axios.post('/addon-attachments', body);
    return mapAddonAttachment(response.data);
  }

  async deleteAddonAttachment(attachmentId: string): Promise<void> {
    await this.axios.delete(`/addon-attachments/${encodeURIComponent(attachmentId)}`);
  }

  // ============ Config Vars ============

  async getConfigVars(appIdOrName: string): Promise<Record<string, string>> {
    let response = await this.axios.get(
      `/apps/${encodeURIComponent(appIdOrName)}/config-vars`
    );
    return response.data;
  }

  async updateConfigVars(
    appIdOrName: string,
    vars: Record<string, string | null>
  ): Promise<Record<string, string>> {
    let response = await this.axios.patch(
      `/apps/${encodeURIComponent(appIdOrName)}/config-vars`,
      vars
    );
    return response.data;
  }

  // ============ Builds ============

  async listBuilds(appIdOrName: string): Promise<HerokuBuild[]> {
    let response = await this.axios.get(`/apps/${encodeURIComponent(appIdOrName)}/builds`);
    return (response.data as any[]).map(mapBuild);
  }

  async getBuild(appIdOrName: string, buildId: string): Promise<HerokuBuild> {
    let response = await this.axios.get(
      `/apps/${encodeURIComponent(appIdOrName)}/builds/${encodeURIComponent(buildId)}`
    );
    return mapBuild(response.data);
  }

  async createBuild(
    appIdOrName: string,
    params: {
      sourceUrl: string;
      sourceVersion?: string;
      checksum?: string;
    }
  ): Promise<HerokuBuild> {
    let body: any = {
      source_blob: {
        url: params.sourceUrl
      }
    };
    if (params.sourceVersion) body.source_blob.version = params.sourceVersion;
    if (params.checksum) body.source_blob.checksum = params.checksum;

    let response = await this.axios.post(
      `/apps/${encodeURIComponent(appIdOrName)}/builds`,
      body
    );
    return mapBuild(response.data);
  }

  // ============ Buildpack Installations ============

  async listBuildpackInstallations(
    appIdOrName: string
  ): Promise<HerokuBuildpackInstallation[]> {
    let response = await this.axios.get(
      `/apps/${encodeURIComponent(appIdOrName)}/buildpack-installations`
    );
    return (response.data as any[]).map(mapBuildpackInstallation);
  }

  async updateBuildpackInstallations(
    appIdOrName: string,
    buildpacks: string[]
  ): Promise<HerokuBuildpackInstallation[]> {
    let response = await this.axios.put(
      `/apps/${encodeURIComponent(appIdOrName)}/buildpack-installations`,
      {
        updates: buildpacks.map(buildpack => ({ buildpack }))
      }
    );
    return (response.data as any[]).map(mapBuildpackInstallation);
  }

  // ============ Releases ============

  async listReleases(appIdOrName: string): Promise<HerokuRelease[]> {
    let response = await this.axios.get(`/apps/${encodeURIComponent(appIdOrName)}/releases`);
    return (response.data as any[]).map(mapRelease);
  }

  async getRelease(appIdOrName: string, releaseIdOrVersion: string): Promise<HerokuRelease> {
    let response = await this.axios.get(
      `/apps/${encodeURIComponent(appIdOrName)}/releases/${encodeURIComponent(releaseIdOrVersion)}`
    );
    return mapRelease(response.data);
  }

  async rollback(appIdOrName: string, releaseId: string): Promise<HerokuRelease> {
    let response = await this.axios.post(`/apps/${encodeURIComponent(appIdOrName)}/releases`, {
      slug: releaseId
    });
    return mapRelease(response.data);
  }

  // ============ Domains ============

  async listDomains(appIdOrName: string): Promise<HerokuDomain[]> {
    let response = await this.axios.get(`/apps/${encodeURIComponent(appIdOrName)}/domains`);
    return (response.data as any[]).map(mapDomain);
  }

  async getDomain(appIdOrName: string, domainIdOrHostname: string): Promise<HerokuDomain> {
    let response = await this.axios.get(
      `/apps/${encodeURIComponent(appIdOrName)}/domains/${encodeURIComponent(domainIdOrHostname)}`
    );
    return mapDomain(response.data);
  }

  async addDomain(
    appIdOrName: string,
    hostname: string,
    params?: {
      sniEndpoint?: string;
    }
  ): Promise<HerokuDomain> {
    let body: any = { hostname };
    if (params?.sniEndpoint) body.sni_endpoint = params.sniEndpoint;

    let response = await this.axios.post(
      `/apps/${encodeURIComponent(appIdOrName)}/domains`,
      body
    );
    return mapDomain(response.data);
  }

  async removeDomain(appIdOrName: string, domainIdOrHostname: string): Promise<void> {
    await this.axios.delete(
      `/apps/${encodeURIComponent(appIdOrName)}/domains/${encodeURIComponent(domainIdOrHostname)}`
    );
  }

  // ============ Collaborators ============

  async listCollaborators(appIdOrName: string): Promise<HerokuCollaborator[]> {
    let response = await this.axios.get(
      `/apps/${encodeURIComponent(appIdOrName)}/collaborators`
    );
    return (response.data as any[]).map(mapCollaborator);
  }

  async addCollaborator(
    appIdOrName: string,
    params: {
      userEmail: string;
      silent?: boolean;
    }
  ): Promise<HerokuCollaborator> {
    let body: any = { user: params.userEmail };
    if (params.silent !== undefined) body.silent = params.silent;

    let response = await this.axios.post(
      `/apps/${encodeURIComponent(appIdOrName)}/collaborators`,
      body
    );
    return mapCollaborator(response.data);
  }

  async removeCollaborator(appIdOrName: string, collaboratorEmailOrId: string): Promise<void> {
    await this.axios.delete(
      `/apps/${encodeURIComponent(appIdOrName)}/collaborators/${encodeURIComponent(collaboratorEmailOrId)}`
    );
  }

  // ============ Pipelines ============

  async listPipelines(): Promise<HerokuPipeline[]> {
    let response = await this.axios.get('/pipelines');
    return (response.data as any[]).map(mapPipeline);
  }

  async getPipeline(pipelineIdOrName: string): Promise<HerokuPipeline> {
    let response = await this.axios.get(`/pipelines/${encodeURIComponent(pipelineIdOrName)}`);
    return mapPipeline(response.data);
  }

  async createPipeline(params: {
    name: string;
    ownerId?: string;
    ownerType?: string;
  }): Promise<HerokuPipeline> {
    let body: any = { name: params.name };
    if (params.ownerId && params.ownerType) {
      body.owner = { id: params.ownerId, type: params.ownerType };
    }

    let response = await this.axios.post('/pipelines', body);
    return mapPipeline(response.data);
  }

  async updatePipeline(
    pipelineId: string,
    params: {
      name?: string;
    }
  ): Promise<HerokuPipeline> {
    let response = await this.axios.patch(
      `/pipelines/${encodeURIComponent(pipelineId)}`,
      params
    );
    return mapPipeline(response.data);
  }

  async deletePipeline(pipelineId: string): Promise<void> {
    await this.axios.delete(`/pipelines/${encodeURIComponent(pipelineId)}`);
  }

  async listPipelineCouplings(pipelineId: string): Promise<HerokuPipelineCoupling[]> {
    let response = await this.axios.get(
      `/pipelines/${encodeURIComponent(pipelineId)}/pipeline-couplings`
    );
    return (response.data as any[]).map(mapPipelineCoupling);
  }

  async createPipelineCoupling(params: {
    pipelineId: string;
    appIdOrName: string;
    stage: string;
  }): Promise<HerokuPipelineCoupling> {
    let body = {
      pipeline: params.pipelineId,
      app: params.appIdOrName,
      stage: params.stage
    };

    let response = await this.axios.post('/pipeline-couplings', body);
    return mapPipelineCoupling(response.data);
  }

  async deletePipelineCoupling(couplingId: string): Promise<void> {
    await this.axios.delete(`/pipeline-couplings/${encodeURIComponent(couplingId)}`);
  }

  async createPipelinePromotion(params: {
    pipelineId: string;
    sourceAppId: string;
    sourceReleaseId: string;
    targetAppIds: string[];
  }): Promise<HerokuPipelinePromotion> {
    let response = await this.axios.post('/pipeline-promotions', {
      pipeline: { id: params.pipelineId },
      source: {
        app: { id: params.sourceAppId },
        release: { id: params.sourceReleaseId }
      },
      targets: params.targetAppIds.map(appId => ({ app: { id: appId } }))
    });
    return mapPipelinePromotion(response.data);
  }

  async getPipelinePromotion(promotionId: string): Promise<HerokuPipelinePromotion> {
    let response = await this.axios.get(
      `/pipeline-promotions/${encodeURIComponent(promotionId)}`
    );
    return mapPipelinePromotion(response.data);
  }

  async listPipelinePromotionTargets(
    promotionId: string
  ): Promise<HerokuPipelinePromotionTarget[]> {
    let response = await this.axios.get(
      `/pipeline-promotions/${encodeURIComponent(promotionId)}/promotion-targets`
    );
    return (response.data as any[]).map(mapPipelinePromotionTarget);
  }

  // ============ Log Drains ============

  async listLogDrains(appIdOrName: string): Promise<HerokuLogDrain[]> {
    let response = await this.axios.get(`/apps/${encodeURIComponent(appIdOrName)}/log-drains`);
    return (response.data as any[]).map(mapLogDrain);
  }

  async addLogDrain(appIdOrName: string, url: string): Promise<HerokuLogDrain> {
    let response = await this.axios.post(
      `/apps/${encodeURIComponent(appIdOrName)}/log-drains`,
      { url }
    );
    return mapLogDrain(response.data);
  }

  async removeLogDrain(appIdOrName: string, drainIdOrUrl: string): Promise<void> {
    await this.axios.delete(
      `/apps/${encodeURIComponent(appIdOrName)}/log-drains/${encodeURIComponent(drainIdOrUrl)}`
    );
  }

  // ============ Log Sessions ============

  async createLogSession(
    appIdOrName: string,
    params: {
      dynoName?: string;
      lines?: number;
      source?: string;
      tail?: boolean;
      type?: string;
    }
  ): Promise<HerokuLogSession> {
    let body: any = {};
    if (params.dynoName) body.dyno_name = params.dynoName;
    if (params.lines !== undefined) body.lines = params.lines;
    if (params.source) body.source = params.source;
    if (params.tail !== undefined) body.tail = params.tail;
    if (params.type) body.type = params.type;

    let response = await this.axios.post(
      `/apps/${encodeURIComponent(appIdOrName)}/log-sessions`,
      body
    );
    return mapLogSession(response.data);
  }

  // ============ SNI Endpoints ============

  async listSniEndpoints(appIdOrName: string): Promise<HerokuSniEndpoint[]> {
    let response = await this.axios.get(
      `/apps/${encodeURIComponent(appIdOrName)}/sni-endpoints`
    );
    return (response.data as any[]).map(mapSniEndpoint);
  }

  async createSniEndpoint(
    appIdOrName: string,
    params: {
      certificateChain: string;
      privateKey: string;
    }
  ): Promise<HerokuSniEndpoint> {
    let response = await this.axios.post(
      `/apps/${encodeURIComponent(appIdOrName)}/sni-endpoints`,
      {
        certificate_chain: params.certificateChain,
        private_key: params.privateKey
      }
    );
    return mapSniEndpoint(response.data);
  }

  async updateSniEndpoint(
    appIdOrName: string,
    endpointId: string,
    params: {
      certificateChain: string;
      privateKey: string;
    }
  ): Promise<HerokuSniEndpoint> {
    let response = await this.axios.patch(
      `/apps/${encodeURIComponent(appIdOrName)}/sni-endpoints/${encodeURIComponent(endpointId)}`,
      {
        certificate_chain: params.certificateChain,
        private_key: params.privateKey
      }
    );
    return mapSniEndpoint(response.data);
  }

  async deleteSniEndpoint(appIdOrName: string, endpointId: string): Promise<void> {
    await this.axios.delete(
      `/apps/${encodeURIComponent(appIdOrName)}/sni-endpoints/${encodeURIComponent(endpointId)}`
    );
  }

  // ============ Webhooks ============

  async listWebhooks(appIdOrName: string): Promise<HerokuWebhook[]> {
    let response = await this.axios.get(`/apps/${encodeURIComponent(appIdOrName)}/webhooks`, {
      headers: HEROKU_WEBHOOK_HEADERS
    });
    return (response.data as any[]).map(mapWebhook);
  }

  async createWebhook(
    appIdOrName: string,
    params: {
      include: string[];
      level: string;
      url: string;
      secret?: string;
      authorization?: string;
    }
  ): Promise<HerokuWebhook> {
    let body: any = {
      include: params.include,
      level: params.level,
      url: params.url
    };
    if (params.secret) body.secret = params.secret;
    if (params.authorization) body.authorization = params.authorization;

    let response = await this.axios.post(
      `/apps/${encodeURIComponent(appIdOrName)}/webhooks`,
      body,
      { headers: HEROKU_WEBHOOK_HEADERS }
    );
    return mapWebhook(response.data);
  }

  async deleteWebhook(appIdOrName: string, webhookId: string): Promise<void> {
    await this.axios.delete(
      `/apps/${encodeURIComponent(appIdOrName)}/webhooks/${encodeURIComponent(webhookId)}`,
      { headers: HEROKU_WEBHOOK_HEADERS }
    );
  }
}

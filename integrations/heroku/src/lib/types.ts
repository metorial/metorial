export interface HerokuApp {
  appId: string;
  name: string;
  region: string;
  stack: string;
  webUrl: string;
  gitUrl: string;
  maintenance: boolean;
  createdAt: string;
  updatedAt: string;
  releasedAt: string | null;
  buildStack: string;
  ownerEmail: string;
  ownerId: string;
  teamName: string | null;
}

export interface HerokuDyno {
  dynoId: string;
  appName: string;
  command: string;
  name: string;
  size: string;
  state: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  attachUrl: string | null;
}

export interface HerokuFormation {
  formationId: string;
  appName: string;
  command: string;
  type: string;
  quantity: number;
  size: string;
  createdAt: string;
  updatedAt: string;
}

export interface HerokuAddon {
  addonId: string;
  appId: string;
  appName: string;
  name: string;
  planName: string;
  planId: string;
  serviceName: string;
  state: string;
  webUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HerokuAddonAttachment {
  attachmentId: string;
  addonId: string;
  addonName: string;
  appId: string;
  appName: string;
  name: string;
  namespace: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HerokuRelease {
  releaseId: string;
  appName: string;
  version: number;
  description: string;
  status: string;
  current: boolean;
  createdAt: string;
  updatedAt: string;
  userEmail: string;
  userId: string;
  slugId: string | null;
}

export interface HerokuBuild {
  buildId: string;
  appId: string;
  status: string;
  outputStreamUrl: string | null;
  sourceUrl: string | null;
  sourceVersion: string | null;
  createdAt: string;
  updatedAt: string;
  userEmail: string;
  userId: string;
  slugId: string | null;
}

export interface HerokuBuildpackInstallation {
  ordinal: number;
  buildpackName: string;
  buildpackUrl: string;
}

export interface HerokuDomain {
  domainId: string;
  appName: string;
  hostname: string;
  kind: string;
  cname: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface HerokuCollaborator {
  collaboratorId: string;
  appName: string;
  userEmail: string;
  userId: string;
  role: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HerokuPipeline {
  pipelineId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  ownerId: string | null;
  ownerType: string | null;
}

export interface HerokuPipelineCoupling {
  couplingId: string;
  pipelineId: string;
  appId: string;
  appName: string;
  stage: string;
  createdAt: string;
  updatedAt: string;
}

export interface HerokuLogDrain {
  drainId: string;
  appName: string;
  url: string;
  token: string;
  createdAt: string;
  updatedAt: string;
}

export interface HerokuLogSession {
  logSessionId: string;
  logplexUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface HerokuPipelinePromotion {
  promotionId: string;
  pipelineId: string;
  sourceAppId: string;
  sourceReleaseId: string;
  status: string;
  createdAt: string;
  updatedAt: string | null;
}

export interface HerokuPipelinePromotionTarget {
  targetId: string;
  appId: string;
  promotionId: string;
  releaseId: string | null;
  status: string;
  errorMessage: string | null;
}

export interface HerokuSniEndpoint {
  endpointId: string;
  appName: string;
  name: string;
  certificateChain: string;
  createdAt: string;
  updatedAt: string;
  domains: string[];
}

export interface HerokuWebhook {
  webhookId: string;
  appId: string;
  include: string[];
  level: string;
  url: string;
  createdAt: string;
  updatedAt: string;
}

export interface HerokuAccount {
  accountId: string;
  email: string;
  name: string | null;
  defaultOrganization: string | null;
  verified: boolean;
  twoFactorAuthentication: boolean;
  createdAt: string;
  updatedAt: string;
}

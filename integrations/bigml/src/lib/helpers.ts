import { type BigMLRegion, Client } from './client';

export type ContextLike = {
  auth: {
    username: string;
    token: string;
    organizationId?: string;
    projectId?: string;
  };
  config: {
    region: 'us' | 'au';
    devMode: boolean;
  };
};

export let createClient = (ctx: ContextLike): Client => {
  return new Client({
    username: ctx.auth.username,
    token: ctx.auth.token,
    region: ctx.config.region as BigMLRegion,
    devMode: ctx.config.devMode,
    organizationId: ctx.auth.organizationId,
    projectId: ctx.auth.projectId
  });
};

export let RESOURCE_TYPES = [
  'source',
  'dataset',
  'model',
  'ensemble',
  'prediction',
  'evaluation',
  'cluster',
  'anomaly',
  'association',
  'topicmodel',
  'timeseries',
  'deepnet',
  'logisticregression',
  'linearregression',
  'pca',
  'fusion',
  'optiml',
  'batchprediction',
  'batchcentroid',
  'batchanomalyscore',
  'batchtopicdistribution',
  'batchprojection',
  'centroid',
  'anomalyscore',
  'associationset',
  'topicdistribution',
  'projection',
  'forecast',
  'script',
  'library',
  'execution',
  'externalconnector',
  'project',
  'sample',
  'correlation',
  'statisticaltest',
  'configuration'
] as const;

export type ResourceType = (typeof RESOURCE_TYPES)[number];

export let RESOURCE_STATUS = {
  WAITING: 0,
  QUEUED: 1,
  STARTED: 2,
  IN_PROGRESS: 3,
  SUMMARIZED: 4,
  FINISHED: 5,
  FAULTY: -1,
  UNKNOWN: -2,
  RUNNABLE: -3
} as const;

export let statusLabel = (code: number): string => {
  switch (code) {
    case 0:
      return 'waiting';
    case 1:
      return 'queued';
    case 2:
      return 'started';
    case 3:
      return 'in_progress';
    case 4:
      return 'summarized';
    case 5:
      return 'finished';
    case -1:
      return 'faulty';
    case -2:
      return 'unknown';
    case -3:
      return 'runnable';
    default:
      return `status_${code}`;
  }
};

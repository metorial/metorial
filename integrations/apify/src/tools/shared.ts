import { z } from 'zod';
import { apifyValidationError } from '../lib/errors';

export let paginationInput = {
  limit: z.number().int().positive().max(1000).optional().default(25),
  offset: z.number().int().min(0).optional().default(0),
  descending: z.boolean().optional().default(true)
};

export let jsonObjectSchema = z.record(z.string(), z.any());

export let requireString = (
  value: string | undefined,
  field: string,
  action?: string
): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw apifyValidationError(
      `${field} is required${action ? ` for ${action} action` : ''}.`
    );
  }

  return value;
};

export let requireArray = <T>(value: T[] | undefined, field: string, action?: string): T[] => {
  if (!Array.isArray(value) || value.length === 0) {
    throw apifyValidationError(
      `${field} must contain at least one item${action ? ` for ${action} action` : ''}.`
    );
  }

  return value;
};

export let requireOneOf = (
  values: Array<{ field: string; value: unknown }>,
  message: string
) => {
  let provided = values.filter(({ value }) => value !== undefined && value !== null);
  if (provided.length !== 1) {
    throw apifyValidationError(message);
  }

  return provided[0]!.field;
};

export let ensureAtLeastOne = (fields: Record<string, unknown>, action: string) => {
  if (!Object.values(fields).some(value => value !== undefined)) {
    throw apifyValidationError(`Provide at least one field to ${action}.`);
  }
};

export let validateRunOptions = (params: { timeout?: number; memory?: number }) => {
  if (
    params.timeout !== undefined &&
    (!Number.isFinite(params.timeout) || params.timeout <= 0)
  ) {
    throw apifyValidationError('timeout must be a positive number of seconds.');
  }

  if (params.memory !== undefined) {
    let memory = params.memory;
    if (!Number.isInteger(memory) || memory < 128 || (memory & (memory - 1)) !== 0) {
      throw apifyValidationError('memory must be a power of 2 and at least 128 MB.');
    }
  }
};

export let pickDefined = (fields: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined));

export let mapRun = (run: Record<string, any>) => ({
  runId: run.id,
  actorId: run.actId,
  actorTaskId: run.actorTaskId,
  status: run.status,
  startedAt: run.startedAt,
  finishedAt: run.finishedAt,
  buildId: run.buildId,
  defaultDatasetId: run.defaultDatasetId,
  defaultKeyValueStoreId: run.defaultKeyValueStoreId,
  defaultRequestQueueId: run.defaultRequestQueueId,
  usage: run.usage
});

export let mapActor = (actor: Record<string, any>) => ({
  actorId: actor.id,
  name: actor.name,
  username: actor.username,
  title: actor.title,
  description: actor.description,
  isPublic: actor.isPublic,
  createdAt: actor.createdAt,
  modifiedAt: actor.modifiedAt,
  defaultRunOptions: actor.defaultRunOptions,
  versions: actor.versions,
  stats: actor.stats
});

export let mapBuild = (build: Record<string, any>) => ({
  buildId: build.id,
  actorId: build.actId,
  status: build.status,
  startedAt: build.startedAt,
  finishedAt: build.finishedAt,
  buildNumber: build.buildNumber,
  versionNumber: build.versionNumber
});

export let mapDataset = (dataset: Record<string, any>) => ({
  datasetId: dataset.id,
  name: dataset.name,
  itemCount: dataset.itemCount,
  cleanItemCount: dataset.cleanItemCount,
  createdAt: dataset.createdAt,
  modifiedAt: dataset.modifiedAt,
  accessedAt: dataset.accessedAt
});

export let mapKeyValueStore = (store: Record<string, any>) => ({
  storeId: store.id,
  name: store.name,
  createdAt: store.createdAt,
  modifiedAt: store.modifiedAt,
  accessedAt: store.accessedAt
});

export let mapRequestQueue = (queue: Record<string, any>) => ({
  queueId: queue.id,
  name: queue.name,
  totalRequestCount: queue.totalRequestCount,
  handledRequestCount: queue.handledRequestCount,
  pendingRequestCount: queue.pendingRequestCount,
  createdAt: queue.createdAt,
  modifiedAt: queue.modifiedAt,
  accessedAt: queue.accessedAt
});

export let mapRequest = (request: Record<string, any>) => ({
  requestId: request.id ?? request.requestId,
  uniqueKey: request.uniqueKey,
  url: request.url,
  method: request.method,
  handledAt: request.handledAt,
  retryCount: request.retryCount,
  userData: request.userData
});

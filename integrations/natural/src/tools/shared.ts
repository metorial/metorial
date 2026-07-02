import type { NaturalAuth, NaturalConfig } from '../lib/client';
import { NaturalClient } from '../lib/client';
import {
  attributesOf,
  idOf,
  listData,
  metaOf,
  type NaturalRecord,
  pickDefined,
  resourceSummary,
  singleData
} from '../lib/envelopes';
import { paginationFrom } from '../lib/pagination';

type Pagination = {
  hasMore: boolean;
  nextCursor: string | null;
};

type ListResult<K extends string> = Record<K, NaturalRecord[]> & {
  pagination: Pagination;
};

type ResourceResult<IdKey extends string, ResourceKey extends string> = Record<
  IdKey,
  string | undefined
> & {
  type: string | undefined;
  status: string | undefined;
} & Record<ResourceKey, NaturalRecord>;

type DeleteResult<
  IdKey extends string,
  ResourceKey extends string,
  DeletedKey extends string
> = ResourceResult<IdKey, ResourceKey> & Record<DeletedKey, boolean>;

export const createClient = (ctx: { auth: NaturalAuth; config: NaturalConfig }) =>
  new NaturalClient({ auth: ctx.auth, config: ctx.config });

export const listResult = <K extends string>(envelope: unknown, key: K): ListResult<K> =>
  ({
    [key]: listData(envelope).map(resourceSummary),
    pagination: paginationFrom(envelope)
  }) as ListResult<K>;

export const listRawResult = <K extends string>(envelope: unknown, key: K): ListResult<K> =>
  ({
    [key]: listData(envelope),
    pagination: paginationFrom(envelope)
  }) as ListResult<K>;

export const resourceResult = <IdKey extends string, ResourceKey extends string>(
  envelope: unknown,
  idKey: IdKey,
  resourceKey: ResourceKey
): ResourceResult<IdKey, ResourceKey> => {
  const resource = singleData(envelope);
  const attributes = attributesOf(resource);

  return {
    [idKey]: idOf(resource),
    type: typeof resource.type === 'string' ? resource.type : undefined,
    status: typeof attributes.status === 'string' ? attributes.status : undefined,
    [resourceKey]: resource
  } as ResourceResult<IdKey, ResourceKey>;
};

export const summaryListMessage = (count: number, label: string) =>
  `Found **${count}** ${label}.`;

export const countOf = (output: NaturalRecord, key: string) =>
  Array.isArray(output[key]) ? output[key].length : 0;

export const metaArray = (envelope: unknown, key: string) => {
  const meta = metaOf(envelope);
  return Array.isArray(meta[key]) ? meta[key] : [];
};

export const deleteOutput = <
  IdKey extends string,
  ResourceKey extends string,
  DeletedKey extends string = 'deleted'
>(
  envelope: unknown,
  idKey: IdKey,
  resourceKey: ResourceKey,
  deletedKey: DeletedKey = 'deleted' as DeletedKey
): DeleteResult<IdKey, ResourceKey, DeletedKey> => {
  const result = resourceResult(envelope, idKey, resourceKey);
  const meta = metaOf(envelope);

  return {
    ...result,
    [deletedKey]: meta.deleted === true
  } as DeleteResult<IdKey, ResourceKey, DeletedKey>;
};

export const attributesBody = (attributes: NaturalRecord) => pickDefined(attributes);

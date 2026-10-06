import { createApiServiceError, pickDefined } from 'slates';
import { z } from 'zod';
import { apiId, type JsonApiResource } from './client';

const dateTimeSchema = z.iso.datetime({ offset: true, local: true });

export interface FlatResource {
  [key: string]: unknown;
  id: string;
  type: string;
  accountId?: string;
  action?: string;
  answeredAt?: string;
  bouncedAt?: string;
  closeDate?: string;
  company?: string;
  completedAt?: string;
  createdAt?: string;
  deliveredAt?: string;
  description?: string;
  dialedAt?: string;
  direction?: string;
  disposition?: string;
  domain?: string;
  dueAt?: string;
  email?: string;
  engagedAt?: string;
  firstName?: string;
  industry?: string;
  lastName?: string;
  linkedInUrl?: string;
  locality?: string;
  mailboxId?: string;
  name?: string;
  note?: string;
  openedAt?: string;
  outcome?: string;
  ownerId?: string;
  prospectId?: string;
  repliedAt?: string;
  sequenceId?: string;
  sequenceStepId?: string;
  sequenceType?: string;
  shareType?: string;
  stageName?: string;
  state?: string;
  subject?: string;
  taskType?: string;
  title?: string;
  updatedAt?: string;
  userId?: string;
  emails?: string[];
  workPhones?: string[];
  tags?: string[];
  amount?: number;
  probability?: number;
  clickCount?: number;
  openCount?: number;
  replyCount?: number;
  order?: number;
  enabled?: boolean;
  locked?: boolean;
  sendDisabled?: boolean;
}
export const flattenResource = (resource: JsonApiResource): FlatResource => {
  const result: FlatResource = { id: resource.id, type: resource.type };
  const strings = new Set([
    'accountId',
    'action',
    'answeredAt',
    'bouncedAt',
    'closeDate',
    'company',
    'completedAt',
    'createdAt',
    'deliveredAt',
    'description',
    'dialedAt',
    'direction',
    'disposition',
    'domain',
    'dueAt',
    'email',
    'engagedAt',
    'firstName',
    'industry',
    'lastName',
    'linkedInUrl',
    'locality',
    'name',
    'note',
    'openedAt',
    'ownerId',
    'prospectId',
    'repliedAt',
    'sequenceId',
    'sequenceType',
    'shareType',
    'stageName',
    'state',
    'subject',
    'taskType',
    'title',
    'updatedAt',
    'outcome',
    'userId',
    'mailboxId',
    'sequenceStepId'
  ]);
  const numbers = new Set([
    'amount',
    'probability',
    'clickCount',
    'openCount',
    'replyCount',
    'order'
  ]);
  const booleans = new Set(['enabled', 'locked', 'sendDisabled']);
  const arrays = new Set(['emails', 'workPhones', 'tags']);
  for (const [key, value] of Object.entries(resource.attributes)) {
    if (value === undefined || value === null || key === 'id' || key === 'type') continue;
    if (
      [
        'userId',
        'ownerId',
        'accountId',
        'prospectId',
        'sequenceId',
        'mailboxId',
        'sequenceStepId'
      ].includes(key)
    ) {
      result[key] = String(apiId(value));
      continue;
    }
    if (
      (strings.has(key) && typeof value !== 'string') ||
      (numbers.has(key) && (typeof value !== 'number' || !Number.isFinite(value))) ||
      (booleans.has(key) && typeof value !== 'boolean') ||
      (arrays.has(key) &&
        (!Array.isArray(value) || value.some(item => typeof item !== 'string')))
    )
      throw createApiServiceError('Outreach returned an unexpected attribute type.');
    result[key] = value;
  }
  for (const [key, relation] of Object.entries(resource.relationships ?? {})) {
    if (relation.data && !Array.isArray(relation.data)) result[`${key}Id`] = relation.data.id;
  }
  return result;
};
export const buildFilterParams = (
  filters: Record<string, string | undefined>
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(filters)
      .filter(([, value]) => value !== undefined && value !== '')
      .map(([key, value]) => [`filter[${key.split('/').join('][')}]`, value as string])
  );
export const buildRelationship = (
  relationship: string,
  id: string | undefined
): Record<string, unknown> | undefined => {
  if (id === undefined) return undefined;
  const type =
    relationship === 'owner'
      ? 'user'
      : relationship === 'stage'
        ? 'opportunityStage'
        : relationship;
  return { [relationship]: { data: { type, id: apiId(id, `${relationship} ID`) } } };
};
export const mergeRelationships = (
  ...relationships: (Record<string, unknown> | undefined)[]
): Record<string, unknown> | undefined => {
  const merged = Object.assign({}, ...relationships.filter(Boolean));
  return Object.keys(merged).length ? merged : undefined;
};
export const cleanAttributes = (obj: Record<string, unknown>): Record<string, unknown> =>
  pickDefined(obj);
export const customAttributes = (
  fields: Record<string, unknown> | undefined
): Record<string, unknown> => {
  for (const key of Object.keys(fields ?? {}))
    if (!/^custom[1-9]\d*$/.test(key))
      throw createApiServiceError(
        'Custom fields must use provider custom1, custom2 and similar field keys. Discover their configured definitions before writing them.'
      );
  return fields ?? {};
};
export const validateInput = (input: Record<string, unknown>) => {
  if (input.pageAfter !== undefined && input.pageOffset !== undefined)
    throw createApiServiceError('Use pageAfter or pageOffset, not both.');
  if (
    input.pageAfter !== undefined &&
    (typeof input.pageAfter !== 'string' ||
      !input.pageAfter ||
      input.pageAfter.length > 8192 ||
      /[\r\n]/.test(input.pageAfter))
  )
    throw createApiServiceError('Provide the returned nextPageAfter cursor.');
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    if (key.endsWith('Id')) apiId(value, key);
    if (typeof value === 'number' && !Number.isFinite(value))
      throw createApiServiceError('Numeric values must be finite.');
    if (
      key === 'pageSize' &&
      (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 1000)
    )
      throw createApiServiceError('Page size must be an integer from 1 to 1000.');
    if (
      key === 'pageOffset' &&
      (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > 10000)
    )
      throw createApiServiceError('Legacy page offset must be an integer from 0 to 10000.');
    if (
      key === 'probability' &&
      (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 100)
    )
      throw createApiServiceError('Probability must be an integer from 0 to 100.');
    if (key === 'amount' && (typeof value !== 'number' || !Number.isSafeInteger(value)))
      throw createApiServiceError('amount must be a safe integer.');
    if (
      key === 'numberOfEmployees' &&
      (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)
    )
      throw createApiServiceError('numberOfEmployees must be a nonnegative safe integer.');
    if (
      (key.endsWith('At') || key === 'closeDate') &&
      (typeof value !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/.test(
          value
        ) ||
        !dateTimeSchema.safeParse(value.replace(/([+-]\d{2})(\d{2})$/, '$1:$2')).success ||
        !Number.isFinite(Date.parse(value)))
    )
      throw createApiServiceError(`${key} must be an ISO 8601 date and time.`);
    if (key === 'name' && (typeof value !== 'string' || !value.trim()))
      throw createApiServiceError('Name must not be empty.');
  }
};

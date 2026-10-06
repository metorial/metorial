import { buildApiServiceError, createApiServiceError, isApiErrorRecord } from 'slates';

export const API_ORIGIN = 'https://api.copper.com/developer_api/v1';
export const PAGE_LIMIT = 200;
export const SEARCH_LIMIT = 100000;
export const entityTypes = [
  'person',
  'company',
  'lead',
  'opportunity',
  'project',
  'task'
] as const;
const relations: Record<string, readonly string[]> = {
  people: ['company', 'opportunity', 'project', 'task'],
  companies: ['person', 'opportunity', 'project', 'task'],
  leads: ['task'],
  opportunities: ['person', 'company', 'project', 'task'],
  projects: ['person', 'company', 'opportunity', 'task'],
  tasks: ['person', 'company', 'lead', 'opportunity', 'project']
};

export const validateId = (value: unknown, label = 'Record ID', zero = false): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < (zero ? 0 : 1))
    throw createApiServiceError(
      `${label} must be a ${zero ? 'nonnegative' : 'positive'} safe integer.`
    );
  return value;
};

const timestamp = (value: unknown, label: string) => validateId(value, label, true);
export const closeDateTimestamp = (value: string): number => {
  if (!/^\d+$/.test(value))
    throw createApiServiceError(
      'Close-date search bounds must be Unix seconds encoded as a decimal string.'
    );
  return timestamp(Number(value), 'Close-date search bound');
};

export const validateInput = (input: Record<string, unknown>, key: string) => {
  for (const [field, value] of Object.entries(input)) {
    if (value === undefined) continue;
    if (field.endsWith('Id')) validateId(value, field, field === 'activityTypeId');
    if (field.endsWith('Ids') && Array.isArray(value)) {
      for (const item of value) {
        if (key === 'search_opportunities' && field === 'statusIds') {
          if (![0, 1, 2, 3].includes(Number(item)))
            throw createApiServiceError(
              'Opportunity status IDs are 0 (Open), 1 (Won), 2 (Lost), or 3 (Abandoned).'
            );
        } else if (
          !(
            item === -2 &&
            (['assigneeIds', 'customerSourceIds', 'lossReasonIds'].includes(field) ||
              (key === 'search_people' && field === 'companyIds'))
          )
        ) {
          validateId(item, field);
        }
      }
    }
    if (typeof value === 'number' && !Number.isFinite(value))
      throw createApiServiceError('Numeric fields must be finite.');
    if (/Date$/.test(field) && typeof value === 'number') timestamp(value, field);
  }
  if (input.name !== undefined && (typeof input.name !== 'string' || !input.name.trim()))
    throw createApiServiceError('Name must contain at least one non-whitespace character.');
  if (input.pageNumber !== undefined || input.pageSize !== undefined) {
    const page = validateId(input.pageNumber ?? 1, 'Page number');
    const size = validateId(input.pageSize ?? 20, 'Page size');
    if (size > PAGE_LIMIT || (page - 1) * size >= SEARCH_LIMIT)
      throw createApiServiceError(
        'Use page sizes from 1 to 200 within the first 100,000 search results; narrow filters for larger result sets.'
      );
  }
  if (key === 'get_person' && input.personId === undefined && !input.email)
    throw createApiServiceError('Provide personId or an email address.');
  for (const [typeField, idField] of [
    ['parentType', 'parentId'],
    ['relatedResourceType', 'relatedResourceId']
  ] as const) {
    if ((input[typeField] === undefined) !== (input[idField] === undefined))
      throw createApiServiceError(`Provide ${typeField} and ${idField} together.`);
    if (
      input[typeField] !== undefined &&
      !entityTypes.includes(input[typeField] as (typeof entityTypes)[number])
    )
      throw createApiServiceError(
        `Choose a supported entity type: ${entityTypes.join(', ')}.`
      );
  }
  if (key === 'log_activity' && input.activityTypeCategory !== 'user')
    throw createApiServiceError(
      'Only user activity types can be logged; system types are available for search only.'
    );
  if (Array.isArray(input.activityTypes)) {
    for (const type of input.activityTypes) {
      if (
        !isApiErrorRecord(type) ||
        !['user', 'system'].includes(String(type.activityTypeCategory))
      )
        throw createApiServiceError('Activity type category must be user or system.');
      validateId(type.activityTypeId, 'Activity type ID', true);
    }
  }
  if (
    typeof input.winProbability === 'number' &&
    (input.winProbability < 0 || input.winProbability > 100)
  )
    throw createApiServiceError('Win probability must be between 0 and 100.');
  for (const stem of ['ActivityDate', 'DueDate', 'MonetaryValue', 'CloseDate']) {
    const minimum = input[`minimum${stem}`];
    const maximum = input[`maximum${stem}`];
    if (minimum !== undefined && maximum !== undefined && Number(minimum) > Number(maximum))
      throw createApiServiceError(
        'Minimum search bounds must not exceed their corresponding maximum.'
      );
  }
  if (key === 'convert_lead') {
    if (isApiErrorRecord(input.person)) validateInput(input.person, 'conversion_person');
    if (isApiErrorRecord(input.opportunity))
      validateInput(input.opportunity, 'conversion_opportunity');
    if (isApiErrorRecord(input.company)) {
      if (input.company.existingCompanyId !== undefined)
        validateId(input.company.existingCompanyId, 'Existing company ID');
      if (input.company.existingCompanyId !== undefined && input.company.name !== undefined)
        throw createApiServiceError(
          'For conversion, provide an existing company ID or a company name, never both. An empty company name explicitly prevents company creation.'
        );
      if (input.company.existingCompanyId === undefined && input.company.name === undefined)
        throw createApiServiceError(
          'Specify an existing company ID or a company name; use an empty name to prevent company creation.'
        );
    }
  }
  if (Array.isArray(input.customFields)) {
    for (const field of input.customFields) {
      if (!isApiErrorRecord(field))
        throw createApiServiceError(
          'Custom fields must contain a definition ID and a JSON value.'
        );
      validateId(field.customFieldDefinitionId, 'Custom field definition ID');
      if (field.value === undefined)
        throw createApiServiceError(
          'Provide an explicit custom field value; null clears a value.'
        );
    }
  }
};

export const validateRelationship = (entity: string, resource: unknown) => {
  if (
    !relations[entity] ||
    !isApiErrorRecord(resource) ||
    !relations[entity].includes(String(resource.type))
  )
    throw createApiServiceError(
      'This entity pair does not support a Copper relationship. Leads relate only to tasks; tasks have one related record, and people have one company.'
    );
  validateId(resource.id, 'Related record ID');
};

export const pageContinuation = (
  input: { pageNumber?: number; pageSize?: number },
  count: number
) => {
  const page = input.pageNumber ?? 1;
  const size = input.pageSize ?? 20;
  const atSearchLimit = page * size >= SEARCH_LIMIT;
  const hasMore = count === size && !atSearchLimit;
  return {
    hasMore,
    nextPageNumber: hasMore ? page + 1 : undefined,
    atSearchLimit: atSearchLimit && count === Math.min(size, SEARCH_LIMIT - (page - 1) * size)
  };
};

export const copperError = (error: unknown) =>
  buildApiServiceError(error, {
    providerLabel: 'Copper',
    reason: 'copper_api_error',
    parent: {},
    extractMessage: () =>
      'Verify the connection, record IDs and permissions. Rate-limited requests should be retried later; writes are never retried automatically.',
    formatMessage: ({ status, message }) =>
      `Copper API request failed${status !== undefined ? ` (HTTP ${status})` : ''}. ${message}`
  });

export const sanitize = (value: unknown, token: string): unknown => {
  if (typeof value === 'string') return token ? value.split(token).join('[redacted]') : value;
  if (Array.isArray(value)) return value.map(item => sanitize(item, token));
  if (!isApiErrorRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(
        ([key]) =>
          !/(?:access.?token|refresh.?token|api.?key|client.?secret|password|authorization|credential)/i.test(
            key
          ) && !(token && key.includes(token))
      )
      .map(([key, item]) => [key, sanitize(item, token)])
  );
};

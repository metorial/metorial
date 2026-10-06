import { createApiServiceError } from 'slates';

export const encodePathSegment = (value: string | number) => {
  const segment = String(value);
  if (!segment.trim() || segment === '.' || segment === '..')
    throw createApiServiceError(
      'Provide a nonempty GitHub identifier without dot path segments.'
    );
  try {
    return encodeURIComponent(segment);
  } catch {
    throw createApiServiceError('The GitHub identifier contains invalid Unicode.');
  }
};

export const validateInput = (input: object) => {
  const fields = input as Record<string, unknown>;
  if (fields.scope === 'org' && !fields.org)
    throw createApiServiceError('org is required for org scope.');
  if (
    (fields.scope === 'repo' || fields.scope === 'environment') &&
    (!fields.owner || !fields.repo)
  )
    throw createApiServiceError('owner and repo are required for this scope.');
  if (fields.scope === 'environment' && !fields.environmentName)
    throw createApiServiceError('environmentName is required for environment scope.');
  for (const field of ['selectedRepositoryIds', 'deploymentEnvironmentIds']) {
    const ids = fields[field];
    if (Array.isArray(ids) && ids.some(id => !Number.isSafeInteger(id) || id < 1))
      throw createApiServiceError(`${field} must contain positive integer IDs.`);
  }
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    if (
      (key.endsWith('Id') ||
        key === 'page' ||
        key === 'perPage' ||
        key === 'jobsPage' ||
        key === 'jobsPerPage') &&
      typeof value === 'number' &&
      (!Number.isSafeInteger(value) ||
        value < 1 ||
        ((key === 'perPage' || key === 'jobsPerPage') && value > 100))
    )
      throw createApiServiceError(
        `${key} must be a positive integer${key === 'perPage' || key === 'jobsPerPage' ? ' no greater than 100' : ''}.`
      );
    if (
      [
        'owner',
        'repo',
        'org',
        'environmentName',
        'workflowId',
        'secretName',
        'variableName',
        'labelName',
        'ref'
      ].includes(key) &&
      typeof value === 'string' &&
      !value.trim()
    )
      throw createApiServiceError(`${key} must not be empty.`);
  }
};

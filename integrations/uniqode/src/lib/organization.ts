import { createApiServiceError } from 'slates';

export let resolveOrganizationId = (input: number | undefined, legacy: string | undefined) => {
  let organizationId = input ?? (legacy === undefined ? undefined : Number(legacy));
  if (
    organizationId === undefined ||
    !Number.isSafeInteger(organizationId) ||
    organizationId <= 0
  ) {
    throw createApiServiceError(
      'Provide a positive organizationId from list_organizations or set a valid default organization ID.'
    );
  }
  return organizationId;
};

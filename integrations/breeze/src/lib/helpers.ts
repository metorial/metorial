import { createApiServiceError, isApiErrorRecord } from 'slates';
import { Client } from './client';

export let createClient = (ctx: {
  auth: { token: string };
  config: { subdomain: string; teamId?: string };
}) => {
  return new Client({
    token: ctx.auth.token,
    subdomain: ctx.config.subdomain,
    teamId: ctx.config.teamId
  });
};

export let requireList = (value: unknown, resource: string): unknown[] => {
  if (!Array.isArray(value)) {
    throw createApiServiceError(`Breeze returned an invalid ${resource} list.`);
  }
  return value;
};

export let requireSuccess = (value: unknown): boolean => {
  if (value === true || value === 'true') return true;
  if (isApiErrorRecord(value) && (value.success === true || value.success === 'true')) {
    return true;
  }
  throw createApiServiceError('Breeze did not confirm that the operation succeeded.');
};

export let serializeProfileFields = async (
  client: Client,
  values: Record<string, unknown>
) => {
  if (!Object.keys(values).length) return '[]';

  let sections = requireList(await client.listProfileFields(), 'profile fields');
  let definitions = new Map<string, string>();
  for (let section of sections) {
    if (!isApiErrorRecord(section) || !Array.isArray(section.fields)) continue;
    for (let field of section.fields) {
      if (
        isApiErrorRecord(field) &&
        typeof field.field_id === 'string' &&
        typeof field.field_type === 'string'
      ) {
        definitions.set(field.field_id, field.field_type);
      }
    }
  }

  let fields = Object.entries(values).flatMap(([fieldId, value]) => {
    let fieldType = definitions.get(fieldId);
    if (!fieldType) {
      throw createApiServiceError(
        `Profile field ${fieldId} was not found. Call list_profile_fields to discover field IDs.`
      );
    }
    // Breeze's update examples use "radio" for both multiple-choice and dropdown fields.
    if (fieldType === 'multiple_choice' || fieldType === 'dropdown') fieldType = 'radio';
    if (isApiErrorRecord(value) && Object.hasOwn(value, 'response')) {
      return [
        {
          field_id: fieldId,
          field_type: fieldType,
          response: value.response,
          ...(value.details === undefined ? {} : { details: value.details })
        }
      ];
    }
    let responses = fieldType === 'checkbox' && Array.isArray(value) ? value : [value];
    return responses.map(response => ({ field_id: fieldId, field_type: fieldType, response }));
  });
  return JSON.stringify(fields);
};

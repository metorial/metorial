import { createApiServiceError } from 'slates';
import { z } from 'zod';
import type { ItemBatchObjectInput } from './client';

const emailSchema = z.email();
const uuidSchema = z.uuid();

const validationError = (message: string, reason: string) =>
  createApiServiceError(message, { reason });

export const isContactsObjectType = (objectType: string) =>
  ['contact', 'contacts'].includes(objectType.trim().toLowerCase());

const supportsSummary = (objectType: string) =>
  ['contact', 'contacts', 'company', 'companies'].includes(objectType.trim().toLowerCase());

export const validateObjectType = (objectType: string) => {
  if (!objectType.trim()) {
    throw validationError(
      'objectType must be a non-empty object type slug.',
      'item_object_type_required'
    );
  }
};

export const validateUuid = (value: string, label: string) => {
  if (!uuidSchema.safeParse(value).success) {
    throw validationError(`${label} must be a valid UUID.`, 'item_uuid_invalid');
  }
};

export const validateObjectLocator = (
  objectType: string,
  locator: { objectId?: number; email?: string }
) => {
  validateObjectType(objectType);
  let hasId = locator.objectId !== undefined;
  let hasEmail = locator.email !== undefined;

  if (hasId === hasEmail) {
    throw validationError(
      'Provide exactly one locator: objectId or email.',
      'item_object_locator_invalid'
    );
  }

  if (hasId && (!Number.isInteger(locator.objectId) || (locator.objectId as number) <= 0)) {
    throw validationError('objectId must be a positive integer.', 'item_object_id_invalid');
  }

  if (hasEmail) {
    if (!isContactsObjectType(objectType)) {
      throw validationError(
        'Email lookup is supported only when objectType is "contact" or "contacts". Use objectId for other object types.',
        'item_email_locator_not_supported'
      );
    }
    if (!emailSchema.safeParse(locator.email).success) {
      throw validationError('email must be a valid email address.', 'item_email_invalid');
    }
  }
};

export const validateIncludeSummary = (objectType: string, includeSummary?: boolean) => {
  if (includeSummary === true && !supportsSummary(objectType)) {
    throw validationError(
      'includeSummary is supported only for contacts and companies. Omit it for custom object types.',
      'item_summary_not_supported'
    );
  }
};

export const validateObjectUpdate = (input: {
  name?: string;
  fields?: Record<string, unknown>;
  profileImageUrl?: string;
}) => {
  if (input.name !== undefined && !input.name.trim()) {
    throw validationError('name must be non-empty when provided.', 'item_update_name_invalid');
  }

  let hasFields = input.fields !== undefined && Object.keys(input.fields).length > 0;
  if (input.name === undefined && !hasFields && input.profileImageUrl === undefined) {
    throw validationError(
      'Provide at least one update: a non-empty name, a non-empty fields object, or profileImageUrl.',
      'item_update_empty'
    );
  }
};

export const validateBatchObjects = (objectType: string, objects: ItemBatchObjectInput[]) => {
  validateObjectType(objectType);

  objects.forEach((object, index) => {
    let row = `objects[${index}]`;
    if (typeof object.name !== 'string' || !object.name.trim()) {
      throw validationError(
        `${row}.name must be a non-empty string. Fix this row and retry the batch.`,
        'item_batch_row_invalid'
      );
    }

    let hasMatchBy = object.matchBy !== undefined;
    let hasMatchValue = object.matchValue !== undefined;
    if (hasMatchBy !== hasMatchValue) {
      throw validationError(
        `${row}.matchBy and ${row}.matchValue must be provided together. Fix this row and retry the batch.`,
        'item_batch_match_pair_invalid'
      );
    }

    if (object.matchBy === 'id') {
      if (
        typeof object.matchValue !== 'number' ||
        !Number.isInteger(object.matchValue) ||
        object.matchValue <= 0
      ) {
        throw validationError(
          `${row}.matchValue must be a positive integer when ${row}.matchBy is "id". Fix this row and retry the batch.`,
          'item_batch_match_id_invalid'
        );
      }
    }

    if (object.matchBy === 'email') {
      if (!isContactsObjectType(objectType)) {
        throw validationError(
          `${row}.matchBy "email" is supported only for contacts. Use "id" or "name" for ${objectType}.`,
          'item_batch_email_match_not_supported'
        );
      }
      if (
        typeof object.matchValue !== 'string' ||
        !emailSchema.safeParse(object.matchValue).success
      ) {
        throw validationError(
          `${row}.matchValue must be a valid email address when ${row}.matchBy is "email". Fix this row and retry the batch.`,
          'item_batch_match_email_invalid'
        );
      }
    }

    if (
      object.matchBy === 'name' &&
      (typeof object.matchValue !== 'string' || !object.matchValue.trim())
    ) {
      throw validationError(
        `${row}.matchValue must be a non-empty string when ${row}.matchBy is "name". Fix this row and retry the batch.`,
        'item_batch_match_name_invalid'
      );
    }
  });
};

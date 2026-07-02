import { z } from 'zod';
import { googleAnalyticsServiceError } from './errors';

export let propertyIdSchema = z
  .string()
  .optional()
  .describe(
    'GA4 property ID. Accepts either "123456789" or "properties/123456789". Optional when the integration config has propertyId; if neither is known, call list_accounts_and_properties first.'
  );

export let propertyIdInstructions = [
  'If propertyId is supplied by the user or configured for the integration, call this tool directly with that property.',
  'If no propertyId is known, call list_accounts_and_properties first to discover accessible GA4 property IDs before using this tool.'
];

export let accountIdSchema = z
  .string()
  .describe(
    'Google Analytics account ID. Accepts either "123456789" or "accounts/123456789".'
  );

export let normalizePropertyId = (value: string) => {
  let trimmed = value.trim();
  let match = /^(?:properties\/)?(\d+)$/.exec(trimmed);

  if (!match) {
    throw googleAnalyticsServiceError(
      'propertyId must be a GA4 property ID like "123456789" or "properties/123456789".'
    );
  }

  let propertyId = match[1];
  if (!propertyId) {
    throw googleAnalyticsServiceError(
      'propertyId must be a GA4 property ID like "123456789" or "properties/123456789".'
    );
  }

  return propertyId;
};

type PropertyIdSource = {
  propertyId?: string;
};

let normalizeOptionalPropertyId = (value: unknown) => {
  if (typeof value !== 'string') {
    return undefined;
  }

  let trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export let resolvePropertyId = (input: PropertyIdSource, config: PropertyIdSource) => {
  let propertyId =
    normalizeOptionalPropertyId(input.propertyId) ??
    normalizeOptionalPropertyId(config.propertyId);

  if (!propertyId) {
    throw googleAnalyticsServiceError(
      'A GA4 propertyId is required. Pass propertyId directly, configure propertyId for the integration, or call list_accounts_and_properties first to discover accessible GA4 property IDs.'
    );
  }

  return normalizePropertyId(propertyId);
};

export let propertyResourceName = (propertyId: string) =>
  `properties/${normalizePropertyId(propertyId)}`;

export let propertyApiPath = (propertyId: string, suffix = '') =>
  `/${propertyResourceName(propertyId)}${suffix}`;

export let normalizeAccountId = (value: string) => {
  let trimmed = value.trim();
  let match = /^(?:accounts\/)?(\d+)$/.exec(trimmed);

  if (!match) {
    throw googleAnalyticsServiceError(
      'accountId must be a Google Analytics account ID like "123456789" or "accounts/123456789".'
    );
  }

  let accountId = match[1];
  if (!accountId) {
    throw googleAnalyticsServiceError(
      'accountId must be a Google Analytics account ID like "123456789" or "accounts/123456789".'
    );
  }

  return accountId;
};

export let accountResourceName = (accountId: string) =>
  `accounts/${normalizeAccountId(accountId)}`;

export let accountApiPath = (accountId: string, suffix = '') =>
  `/${accountResourceName(accountId)}${suffix}`;

import { createApiServiceError } from 'slates';
import { z } from 'zod';
import type { OracleCollectionPath, OracleFusionClient } from '../../lib/client';
import { idField, type OracleRecord } from '../../lib/records';
import { resourceKeySchema } from '../../lib/schemas';

export const numericIdSchema = z.string().regex(/^\d+$/).max(18);
export const organizationIdSchema = numericIdSchema.describe(
  'Inventory organization ID represented as a string. Call list_inventory_organizations to discover authorized IDs.'
);
export const organizationCodeSchema = z
  .string()
  .min(1)
  .max(18)
  .describe(
    'Exact inventory organization code. Call list_inventory_organizations to discover authorized codes.'
  );
export const itemIdSchema = numericIdSchema.describe(
  'Inventory item ID represented as a string. Call list_items for the selected organization to discover item IDs.'
);
export const itemNumberSchema = z
  .string()
  .min(1)
  .max(300)
  .describe('Exact inventory item number. Call list_items to discover item numbers.');

export const resourceFields = {
  resourceKey: resourceKeySchema,
  selfLink: z.string().url().optional().describe('Oracle URL for this resource.')
};

export const mapResource = (
  client: OracleFusionClient,
  collection: OracleCollectionPath,
  record: OracleRecord
) => ({
  resourceKey: client.resourceKey(record, 'fscm', collection),
  selfLink: client.selfLink(record, 'fscm', collection)
});

export const requiredId = (record: OracleRecord, field: string): string => {
  let value = idField(record, field);
  if (!value) {
    throw createApiServiceError(
      `Oracle Fusion did not return the required ${field} identifier.`,
      {
        reason: 'oracle_fusion_invalid_response'
      }
    );
  }
  return value;
};

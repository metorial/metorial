import { z } from 'zod';

export let siteIdSchema = z
  .string()
  .describe('Site ID. Call list_sites to discover site IDs.');
export let assetTypeIdSchema = z
  .string()
  .describe('Asset type ID. Call list_asset_types to discover asset types.');

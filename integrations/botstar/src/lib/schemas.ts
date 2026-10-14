import { z } from 'zod';

export let botIdSchema = z
  .string()
  .min(1)
  .describe('Bot ID. Call list_bots to discover authorized bot IDs.');

export let entityIdSchema = z
  .string()
  .min(1)
  .describe('CMS entity ID. Call list_cms_entities to discover entity IDs and field keys.');

export let itemIdSchema = z
  .string()
  .min(1)
  .describe('CMS item ID. Call list_cms_items to discover item IDs.');

export let botScopeGuidance = 'Call list_bots to discover the bot ID first.';

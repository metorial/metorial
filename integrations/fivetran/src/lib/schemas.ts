import { z } from 'zod';

export const groupId = z
  .string()
  .describe('Group ID. Call list_groups to discover authorized groups.');
export const connectionId = z
  .string()
  .describe('Connection ID. Call list_connections to discover authorized connections.');
export const destinationId = z
  .string()
  .describe('Destination ID. Call list_destinations to discover authorized destinations.');
export const userId = z
  .string()
  .describe('User ID. Call list_users to discover authorized users.');
export const teamId = z
  .string()
  .describe('Team ID. Call list_teams to discover authorized teams.');
export const transformationId = z
  .string()
  .describe(
    'Transformation ID. Call list_transformations to discover authorized transformations.'
  );
export const webhookId = z
  .string()
  .describe('Webhook ID. Call list_webhooks to discover authorized webhooks.');

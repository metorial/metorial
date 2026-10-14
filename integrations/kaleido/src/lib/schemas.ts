import { z } from 'zod';

export let consortiumId = z
  .string()
  .min(1)
  .describe('Consortium ID. Call list_consortia to discover available consortia.');

export let environmentId = z
  .string()
  .min(1)
  .describe(
    'Environment ID. Call manage_environment with action list to discover environments.'
  );

export let membershipId = z
  .string()
  .min(1)
  .describe('Membership ID. Call manage_membership with action list to discover memberships.');

export let contractProjectId = z
  .string()
  .min(1)
  .describe(
    'Contract project ID. Call manage_contract_project with action list to discover projects.'
  );

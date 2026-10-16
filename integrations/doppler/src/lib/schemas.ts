import { z } from 'zod';

export let projectInput = z
  .string()
  .describe('Project slug. Use manage_projects with action list to discover projects.');

export let configInput = z
  .string()
  .describe('Config name. Use manage_configs with action list to discover configs.');

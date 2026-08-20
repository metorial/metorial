import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    instanceUrl: {
      schema: z
        .string()
        .describe('Your Brightspace instance URL (e.g. https://myschool.brightspace.com)'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    lpVersion: {
      schema: z
        .string()
        .default('1.49')
        .describe('Learning Platform API version (default: 1.49)'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    leVersion: {
      schema: z
        .string()
        .default('1.82')
        .describe('Learning Environment API version (default: 1.82)'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    basVersion: {
      schema: z
        .string()
        .default('2.5')
        .describe('Badge and Award System API version (default: 2.5)'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});

import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    instanceUrl: z
      .string()
      .describe('Your Brightspace instance URL (e.g. https://myschool.brightspace.com)'),
    lpVersion: z
      .string()
      .default('1.49')
      .describe('Learning Platform API version (default: 1.49)'),
    leVersion: z
      .string()
      .default('1.82')
      .describe('Learning Environment API version (default: 1.82)'),
    basVersion: z
      .string()
      .default('2.5')
      .describe('Badge and Award System API version (default: 2.5)')
  })
);

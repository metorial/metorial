import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    defaultFolderFullName: {
      schema: z
        .string()
        .optional()
        .describe(
          'Optional Jenkins folder full name to use when folderFullName is omitted, using slash-separated folder names.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    defaultJobFullName: {
      schema: z
        .string()
        .optional()
        .describe(
          'Optional Jenkins job full name to use when jobFullName is omitted, using slash-separated folder and job names.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    maxLogLines: {
      schema: z
        .number()
        .int()
        .positive()
        .max(100000)
        .default(10000)
        .describe('Default maximum Jenkins console log lines returned by log tools.'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});

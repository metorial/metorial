import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    defaultFolderFullName: z
      .string()
      .optional()
      .describe(
        'Optional Jenkins folder full name to use when folderFullName is omitted, using slash-separated folder names.'
      ),
    defaultJobFullName: z
      .string()
      .optional()
      .describe(
        'Optional Jenkins job full name to use when jobFullName is omitted, using slash-separated folder and job names.'
      ),
    maxLogLines: z
      .number()
      .int()
      .positive()
      .max(100000)
      .default(10000)
      .describe('Default maximum Jenkins console log lines returned by log tools.')
  })
);

import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    folderId: z
      .string()
      .optional()
      .describe(
        'Yandex Cloud Folder ID. If specified, used as the default folder for all operations.'
      ),
    cloudId: z
      .string()
      .optional()
      .describe('Yandex Cloud ID. Required for cloud-level operations like listing folders.')
  })
);

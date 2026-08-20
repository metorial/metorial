import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    folderId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Yandex Cloud Folder ID. If specified, used as the default folder for all operations.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    cloudId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Yandex Cloud ID. Required for cloud-level operations like listing folders.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});

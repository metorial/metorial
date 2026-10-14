import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    appId: z
      .string()
      .describe(
        'Your AppDrag project subdomain (App ID), as used in https://{appId}.appdrag.site. Also shown in the top-left corner of the CloudBackend Portal.'
      )
  })
);

import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    cloudName: {
      schema: z
        .string()
        .describe(
          'Your Cloudinary cloud name, found on the API Keys page of the Cloudinary Console Settings.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    region: {
      schema: z
        .enum(['us', 'eu', 'ap'])
        .default('us')
        .describe(
          'Data center region. Use "eu" for Europe, "ap" for Asia Pacific, or "us" (default) for US.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});

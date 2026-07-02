import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    cloudName: z
      .string()
      .describe(
        'Your Cloudinary cloud name, found on the API Keys page of the Cloudinary Console Settings.'
      ),
    region: z
      .enum(['us', 'eu', 'ap'])
      .default('us')
      .describe(
        'Data center region. Use "eu" for Europe, "ap" for Asia Pacific, or "us" (default) for US.'
      )
  })
);

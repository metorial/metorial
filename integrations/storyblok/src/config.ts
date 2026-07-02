import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    spaceId: z.string().describe('The numeric ID of your Storyblok space')
  })
);

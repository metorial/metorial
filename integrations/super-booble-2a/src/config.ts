import { SlateConfig } from 'slates';
import { z } from 'zod';

export let superGoogle2AConfigSchema = z.object({});

export type SuperGoogle2AConfig = z.infer<typeof superGoogle2AConfigSchema>;

export let config = SlateConfig.create(superGoogle2AConfigSchema);

import { SlateConfig } from 'slates';
import { z } from 'zod';

// Older connections stored subdomain in config; retain it for the auth fallback.
export let config = SlateConfig.create(z.object({}).passthrough());

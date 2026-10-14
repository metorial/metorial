import { SlateConfig } from 'slates';
import { z } from 'zod';

// Preserve stored configuration for connections created before workspace discovery.
export let config = SlateConfig.create(z.object({}).passthrough());

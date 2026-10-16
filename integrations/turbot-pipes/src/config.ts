import { SlateConfig } from 'slates';
import { z } from 'zod';

// Preserve legacy stored baseUrl values; new connections configure their tenant during auth.
export let config = SlateConfig.create(z.object({}).passthrough());

import { SlateConfig } from 'slates';
import { z } from 'zod';

// Preserve stored legacy baseUrl without declaring the same setting twice.
export let config = SlateConfig.create(z.object({}).passthrough());

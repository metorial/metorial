import { SlateConfig } from 'slates';
import { z } from 'zod';

// Keep saved applicationId values from existing connections through config parsing.
export let config = SlateConfig.create(z.object({}).passthrough());

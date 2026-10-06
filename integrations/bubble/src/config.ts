import { SlateConfig } from 'slates';
import { z } from 'zod';

// Existing configurations retain their validated URL fallback; new auth owns it.
export let config = SlateConfig.create(z.object({}).passthrough());

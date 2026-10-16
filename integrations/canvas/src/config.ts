import { SlateConfig } from 'slates';
import { z } from 'zod';

// Preserve stored domains from connections created before the domain moved to auth.
export let config = SlateConfig.create(z.object({}).passthrough());

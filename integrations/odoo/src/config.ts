import { SlateConfig } from 'slates';
import { z } from 'zod';

// Preserve stored config for connections created before connection details moved to auth.
export let config = SlateConfig.create(z.object({}).passthrough());

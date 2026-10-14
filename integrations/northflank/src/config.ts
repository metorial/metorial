import { SlateConfig } from 'slates';
import { z } from 'zod';

// Retain stored connection properties for connections created before team scope
// moved to individual tool inputs.
export let config = SlateConfig.create(z.object({}).passthrough());

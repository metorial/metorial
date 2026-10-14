import { SlateConfig } from 'slates';
import { z } from 'zod';

// Preserve projectId stored by existing connections after config parsing.
export let config = SlateConfig.create(z.object({}).passthrough());

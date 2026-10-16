import { SlateConfig } from 'slates';
import { z } from 'zod';

// Retain stored config on existing connections without showing a second setup field.
export let config = SlateConfig.create(z.object({}).passthrough());

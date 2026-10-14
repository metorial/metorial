import { SlateConfig } from 'slates';
import { z } from 'zod';

// Retain stored config values for connections created before team discovery.
export let config = SlateConfig.create(z.object({}).passthrough());

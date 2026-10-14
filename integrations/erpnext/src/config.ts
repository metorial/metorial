import { SlateConfig } from 'slates';
import { z } from 'zod';

// Keep legacy site configuration available to existing connections.
export let config = SlateConfig.create(z.object({}).passthrough());

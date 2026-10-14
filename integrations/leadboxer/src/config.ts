import { SlateConfig } from 'slates';
import { z } from 'zod';

// Keep legacy stored dataset IDs available without requiring them at connection setup.
export let config = SlateConfig.create(z.object({}).passthrough());

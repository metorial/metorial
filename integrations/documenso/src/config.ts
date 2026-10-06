import { SlateConfig } from 'slates';
import { z } from 'zod';
// The instance belongs to auth. Preserve stored baseUrl only for existing connections.
export let config = SlateConfig.create(z.object({}).passthrough());

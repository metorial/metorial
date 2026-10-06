import { SlateConfig } from 'slates';
import { z } from 'zod';
// Unknown saved properties retain the old region fallback without requesting it twice.
export let config = SlateConfig.create(z.object({}).passthrough());

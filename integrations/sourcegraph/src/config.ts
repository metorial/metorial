import { SlateConfig } from 'slates';
import { z } from 'zod';

// Unbound stored connections keep their original configured URL as a compatibility fallback.
export const config = SlateConfig.create(z.object({}).passthrough());

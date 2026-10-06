import { SlateConfig } from 'slates';
import { z } from 'zod';
// Old stored resource IDs remain available only as validated compatibility fallbacks.
export const config = SlateConfig.create(z.object({}).passthrough());

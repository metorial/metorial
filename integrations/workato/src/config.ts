import { SlateConfig } from 'slates';
import { z } from 'zod';
// Retain stored legacy configuration; new connections bind their region in auth.
export const config = SlateConfig.create(z.object({}).passthrough());

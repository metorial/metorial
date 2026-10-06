import { SlateConfig } from 'slates';
import { z } from 'zod';

// Preserve saved instance configuration while new connections store it with their key.
export const config = SlateConfig.create(z.object({}).passthrough());

import { SlateConfig } from 'slates';
import { z } from 'zod';

// Keep legacy saved config values available as a fallback; new connections choose the API environment during authentication.
export const config = SlateConfig.create(z.object({}).passthrough());

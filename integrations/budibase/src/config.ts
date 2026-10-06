import { SlateConfig } from 'slates';
import { z } from 'zod';

// Retain the former baseUrl on stored profiles; new connections keep it with authentication.
export const config = SlateConfig.create(z.object({}).passthrough());

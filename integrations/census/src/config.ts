import { SlateConfig } from 'slates';
import { z } from 'zod';

// Retain undeclared stored region for connections created before auth-owned region.
export const config = SlateConfig.create(z.object({}).passthrough());

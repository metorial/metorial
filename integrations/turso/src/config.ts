import { SlateConfig } from 'slates';
import { z } from 'zod';

// Keep legacy stored configuration readable without requiring organization selection during setup.
export const config = SlateConfig.create(z.object({}).passthrough());

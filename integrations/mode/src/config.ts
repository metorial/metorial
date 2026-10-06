import { SlateConfig } from 'slates';
import { z } from 'zod';

// Preserve the workspace slug in older stored connections without asking for it twice.
export const config = SlateConfig.create(z.object({}).passthrough());

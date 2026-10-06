import { SlateConfig } from 'slates';
import { z } from 'zod';

// Retain stored legacy instanceUrl configuration; new sessions bind their own origin.
export const config = SlateConfig.create(z.object({}).passthrough());

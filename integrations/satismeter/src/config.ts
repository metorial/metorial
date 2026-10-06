import { SlateConfig } from 'slates';
import { z } from 'zod';

// Retain the stored projectId on existing connections without requiring it on new ones.
export let config = SlateConfig.create(z.object({}).passthrough());

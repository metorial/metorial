import { SlateConfig } from 'slates';
import { z } from 'zod';

// Preserve the saved baseUrl of older connections without exposing it at setup.
export let config = SlateConfig.create(z.object({}).passthrough());

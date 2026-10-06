import { SlateConfig } from 'slates';
import { z } from 'zod';

// Preserve legacy stored fields for scope validation without requesting IDs at setup.
export let config = SlateConfig.create(z.object({}).passthrough());

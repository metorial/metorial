import { SlateConfig } from 'slates';
import { z } from 'zod';

// Preserve stored connection settings so older connections can resolve their account domain.
export let config = SlateConfig.create(z.object({}).passthrough());

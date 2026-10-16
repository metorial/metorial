import { SlateConfig } from 'slates';
import { z } from 'zod';

// Preserve stored account codes without requesting a setup ID for new connections.
export let config = SlateConfig.create(z.object({}).passthrough());

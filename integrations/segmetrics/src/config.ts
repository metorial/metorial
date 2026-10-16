import { SlateConfig } from 'slates';
import { z } from 'zod';

// Retain stored legacy account/integration IDs without requesting config IDs for new connections.
export let config = SlateConfig.create(z.object({}).passthrough());

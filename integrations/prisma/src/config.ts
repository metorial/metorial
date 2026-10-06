import { SlateConfig } from 'slates';
import { z } from 'zod';

// Keep legacy stored defaults readable without asking new connections for an opaque workspace ID.
export let config = SlateConfig.create(z.object({}).passthrough());

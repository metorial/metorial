import { SlateConfig } from 'slates';
import { z } from 'zod';

// Retain legacy deployment URLs while new connections store them with auth.
export let config = SlateConfig.create(z.object({}).passthrough());

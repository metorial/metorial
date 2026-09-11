import { SlateConfig } from 'slates';
import { z } from 'zod';

// Preserve stored legacy region values without asking new connections to enter it twice.
export let config = SlateConfig.create(z.object({}).passthrough());

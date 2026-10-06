import { SlateConfig } from 'slates';
import { z } from 'zod';

// Preserve legacy saved endpoint values without offering a second endpoint setting.
export let config = SlateConfig.create(z.object({}).passthrough());

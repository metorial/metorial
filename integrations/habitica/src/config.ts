import { SlateConfig } from 'slates';
import { z } from 'zod';

// Preserve legacy saved fields without exposing them in the new configuration form.
export let config = SlateConfig.create(z.object({}).passthrough());

import { SlateConfig } from 'slates';
import { z } from 'zod';

// Preserve instance URLs stored by connections created before auth owned this value.
export let config = SlateConfig.create(z.object({}).passthrough());

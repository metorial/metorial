import { SlateConfig } from 'slates';
import { z } from 'zod';

// Preserve the stored data center on connections created before it moved into auth.
export let config = SlateConfig.create(z.object({}).passthrough());

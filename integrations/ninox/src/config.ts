import { SlateConfig } from 'slates';
import { z } from 'zod';

// Retain stored endpoint settings on connections created before auth owned the URL.
export let config = SlateConfig.create(z.object({}).passthrough());

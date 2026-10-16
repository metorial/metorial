import { SlateConfig } from 'slates';
import { z } from 'zod';

// Retain legacy workspace routing without requiring an opaque setup value.
export let config = SlateConfig.create(z.object({}).passthrough());

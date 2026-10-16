import { SlateConfig } from 'slates';
import { z } from 'zod';

// Preserve saved endpointUrl values while new connections own the instance URL in auth.
export let config = SlateConfig.create(z.object({}).passthrough());

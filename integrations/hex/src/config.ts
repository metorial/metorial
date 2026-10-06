import { SlateConfig } from 'slates';
import { z } from 'zod';

// Preserve the deployment origin in older stored connections; new connections set it in authentication.
export let config = SlateConfig.create(z.object({}).passthrough());

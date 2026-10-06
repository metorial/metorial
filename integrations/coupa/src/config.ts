import { SlateConfig } from 'slates';
import { z } from 'zod';
// Retain previously stored configuration without advertising a duplicate auth field.
export let config = SlateConfig.create(z.object({}).catchall(z.unknown()));

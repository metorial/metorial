import { SlateConfig } from 'slates';
import { z } from 'zod';

// Retain legacy stored environment values while new connections select the region during auth.
export let config = SlateConfig.create(z.object({}).passthrough());

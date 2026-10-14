import { SlateConfig } from 'slates';
import { z } from 'zod';

// Retain stored connection settings while new connections keep instance and organization in auth.
export let config = SlateConfig.create(z.object({}).passthrough());

import { SlateConfig } from 'slates';
import { z } from 'zod';

// Retain legacy instance URLs at runtime without asking new connections
// to configure the same URL in both auth and tool configuration.
export let config = SlateConfig.create(z.object({}).passthrough());

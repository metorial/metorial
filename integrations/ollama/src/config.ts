import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseUrl: z
      .string()
      .default('http://localhost:11434')
      .describe(
        'Base URL for the Ollama server. Defaults to http://localhost:11434 for local installations. Use https://ollama.com for Ollama Cloud.'
      )
  })
);

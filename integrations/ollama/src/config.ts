import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseUrl: {
      schema: z
        .string()
        .default('http://localhost:11434')
        .describe(
          'Base URL for the Ollama server. Defaults to http://localhost:11434 for local installations. Use https://ollama.com for Ollama Cloud.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});

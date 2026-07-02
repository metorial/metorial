import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // CircleCI does not require global configuration beyond authentication.
    // The API base URL is fixed at https://circleci.com/api/v2/
    // Project slugs and other identifiers are passed per-tool as input.
  })
);

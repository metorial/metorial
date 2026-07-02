import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // SurveyMonkey API base URL varies by datacenter (US, EU, CA)
    // The correct access_url is returned during OAuth token exchange
    // and stored in auth output, so no global config needed
  })
);

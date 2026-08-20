import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // SurveyMonkey API base URL varies by datacenter (US, EU, CA)
    // The correct access_url is returned during OAuth token exchange
    // and stored in auth output, so no global config needed
  }
});

import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    endpointUrl: {
      schema: z
        .string()
        .default('https://app.datarobot.com')
        .describe(
          'DataRobot instance URL (e.g. https://app.datarobot.com, https://app.eu.datarobot.com, https://app.jp.datarobot.com, or a self-managed URL)'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});

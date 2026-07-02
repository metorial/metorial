import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    endpointUrl: z
      .string()
      .default('https://app.datarobot.com')
      .describe(
        'DataRobot instance URL (e.g. https://app.datarobot.com, https://app.eu.datarobot.com, https://app.jp.datarobot.com, or a self-managed URL)'
      )
  })
);

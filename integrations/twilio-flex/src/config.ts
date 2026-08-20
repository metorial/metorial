import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    accountSid: {
      schema: z
        .string()
        .describe('Twilio Account SID (ACxxxxx). Found in the Twilio Console.'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    workspaceSid: {
      schema: z
        .string()
        .optional()
        .describe('TaskRouter Workspace SID (WSxxxxx). Required for task routing operations.'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    flexInstanceSid: {
      schema: z
        .string()
        .optional()
        .describe('Flex Instance SID (GOxxxxx). Found on the Flex Overview page in Console.'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});

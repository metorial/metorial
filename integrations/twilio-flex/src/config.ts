import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    accountSid: z
      .string()
      .describe('Twilio Account SID (ACxxxxx). Found in the Twilio Console.'),
    workspaceSid: z
      .string()
      .optional()
      .describe('TaskRouter Workspace SID (WSxxxxx). Required for task routing operations.'),
    flexInstanceSid: z
      .string()
      .optional()
      .describe('Flex Instance SID (GOxxxxx). Found on the Flex Overview page in Console.')
  })
);

import { z } from 'zod';
export const transactionFields = {
  name: z.string().min(1).optional().describe('Transaction check name'),
  steps: z
    .array(
      z.object({
        fn: z.string().min(1).describe('Operation from Pingdom TMS Steps Vocabulary'),
        args: z
          .record(z.string(), z.string())
          .describe('Parameters for the selected operation')
      })
    )
    .min(1)
    .optional()
    .describe('Transaction steps; only run against systems you are authorized to test'),
  active: z
    .boolean()
    .optional()
    .describe('Whether the check runs; false creates an inactive check'),
  interval: z
    .number()
    .int()
    .refine(value => [5, 10, 20, 60, 720, 1440].includes(value))
    .optional()
    .describe('Interval in minutes, subject to account plan'),
  region: z.enum(['us-east', 'us-west', 'eu', 'au']).optional().describe('Execution region'),
  contactIds: z
    .array(z.number().int().positive())
    .optional()
    .describe('Alerting contact IDs; use list_contacts to discover them'),
  teamIds: z
    .array(z.number().int().positive())
    .optional()
    .describe('Alerting team IDs; use list_teams to discover them'),
  integrationIds: z
    .array(z.number().int().positive())
    .optional()
    .describe('Notification integration IDs'),
  customMessage: z.string().optional().describe('Custom alert message'),
  sendNotificationWhenDown: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe('Consecutive failures before alerting'),
  severityLevel: z.enum(['low', 'high']).optional().describe('Alert severity'),
  tags: z
    .array(z.string().regex(/^[A-Za-z0-9_-]{1,64}$/))
    .optional()
    .describe('Tags for organizing transaction checks')
};
export const transactionPayload = (input: z.infer<z.ZodObject<typeof transactionFields>>) => ({
  name: input.name,
  steps: input.steps,
  active: input.active,
  interval: input.interval,
  region: input.region,
  contact_ids: input.contactIds,
  team_ids: input.teamIds,
  integration_ids: input.integrationIds,
  custom_message: input.customMessage,
  send_notification_when_down: input.sendNotificationWhenDown,
  severity_level: input.severityLevel,
  tags: input.tags
});

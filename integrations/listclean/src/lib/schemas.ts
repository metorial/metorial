import { z } from 'zod';

export let verificationListSchema = z.object({
  list_id: z.number().optional().describe('Verification list identifier'),
  filename: z.string().optional().describe('Source filename'),
  size_in_bytes: z.number().optional().describe('Source file size in bytes'),
  request_time: z.string().optional().describe('Time the list was submitted'),
  status: z
    .string()
    .optional()
    .describe('Provider status: SUBMITTED, INPROCESS, or COMPLETED'),
  upload_id: z.string().optional().describe('Provider upload reference')
});

export let verificationListIdSchema = z
  .string()
  .describe(
    'Verification list ID. Use list_verification_lists to find lists, or the listId from verify_email_batch.'
  );

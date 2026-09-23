import { z } from 'zod';

export const spreadsheetChangeEventSchema = z.object({
  source: z.literal('drive_file_modified'),
  spreadsheetId: z.string().min(1),
  modifiedTime: z.string().datetime(),
  lastModifyingUserEmail: z.string().optional(),
  lastModifyingUserName: z.string().optional()
});

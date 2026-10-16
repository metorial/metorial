import { z } from 'zod';

export let attachmentSchema = z
  .object({
    Id: z.number().optional().describe('File ID for get_attachment or delete_attachment'),
    RecordType: z.string().optional(),
    RecordId: z.number().optional(),
    FileName: z.string().optional(),
    FileSize: z.number().optional(),
    FileType: z.string().optional()
  })
  .passthrough();

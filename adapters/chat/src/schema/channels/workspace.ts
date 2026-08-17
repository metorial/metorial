import { z } from 'zod';

export let workspaceSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  domain: z.string().optional(),
  imageUrl: z.string().optional()
});

export type Workspace = z.infer<typeof workspaceSchema>;

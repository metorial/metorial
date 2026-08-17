import { z } from 'zod';
import { rawSchema } from '../shared/raw';

export let workspaceSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  domain: z.string().optional(),
  imageUrl: z.string().optional(),
  raw: rawSchema
});

export type Workspace = z.infer<typeof workspaceSchema>;

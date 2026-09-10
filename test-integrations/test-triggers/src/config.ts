import { SlateConfig } from 'slates';
import { z } from 'zod';

export let testConfigSchema = z.object({
  workspaceId: z
    .string()
    .describe('Workspace ID used to route trigger events to this install')
});

export type TestConfig = z.infer<typeof testConfigSchema>;

export let config = SlateConfig.create(testConfigSchema).getDefaultConfig(() => ({
  workspaceId: 'workspace-default'
}));

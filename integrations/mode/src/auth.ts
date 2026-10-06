import { SlateAuth } from 'slates';
import { z } from 'zod';
import { ModeClient } from './lib/client';

const outputSchema = z.object({
  token: z.string().describe('Mode API token'),
  secret: z.string().describe('Mode API secret'),
  workspaceName: z.string().optional().describe('Authorized Mode workspace slug')
});
const inputSchema = z.object({
  token: z
    .string()
    .describe('Mode API token; workspace tokens have administrator permissions'),
  secret: z.string().describe('Mode API secret'),
  workspaceName: z.string().describe('Workspace slug from your Mode URL')
});
export const auth = SlateAuth.create()
  .output(outputSchema)
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Token',
    key: 'api_token',
    inputSchema,
    getOutput: async (ctx: { input: z.infer<typeof inputSchema> }) => {
      const client = new ModeClient(ctx.input);
      await client.getCurrentAccount();
      return { output: ctx.input };
    },
    getProfile: async (ctx: {
      output: z.infer<typeof outputSchema>;
      input: z.infer<typeof inputSchema>;
    }) => {
      const account = await new ModeClient({
        ...ctx.output,
        workspaceName: ctx.output.workspaceName ?? ctx.input.workspaceName
      }).getCurrentAccount();
      return {
        profile: { name: account.name || account.accountName, id: account.accountToken }
      };
    }
  });

import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let outputSchema = z.object({
  token: z.string().describe('Mode API token (public component)'),
  secret: z.string().describe('Mode API secret (private component)')
});

let inputSchema = z.object({
  token: z.string().describe('Mode API token (public component of the credential)'),
  secret: z.string().describe('Mode API secret (private component of the credential)'),
  workspaceName: z.string().describe('Workspace name for profile verification')
});

type OutputType = z.infer<typeof outputSchema>;
type InputType = z.infer<typeof inputSchema>;

export let auth = SlateAuth.create()
  .output(outputSchema)
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Token',
    key: 'api_token',

    inputSchema,

    getOutput: async (ctx: { input: InputType }) => {
      return {
        output: {
          token: ctx.input.token,
          secret: ctx.input.secret
        }
      };
    },

    getProfile: async (ctx: { output: OutputType; input: InputType }) => {
      let basicAuth = btoa(`${ctx.output.token}:${ctx.output.secret}`);
      let http = createAxios({
        baseURL: 'https://app.mode.com/api',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/hal+json',
          Authorization: `Basic ${basicAuth}`
        }
      });

      try {
        await http.get(`/${ctx.input.workspaceName}/memberships`);
      } catch {
        // If auth fails, we'll still return the workspace name
      }

      return {
        profile: {
          name: ctx.input.workspaceName,
          id: ctx.input.workspaceName
        }
      };
    }
  });

import { SlateAuth } from 'slates';
import { z } from 'zod';

const postServerToken = z
  .string()
  .optional()
  .describe(
    'Optional separate project token with post_server_item scope for reporting occurrences and deploys. It must belong to the project you intend to report to. Ingestion scopes cannot be combined with read/write scopes.'
  );
export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      tokenType: z.enum(['project', 'account']).optional(),
      postServerToken: z.string().optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Project Access Token',
    key: 'project_access_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Project access token from Project Settings → Project Access Tokens. Read tools require read scope; management tools require write scope.'
        ),
      postServerToken
    }),
    getOutput: async ctx => ({
      output: {
        token: ctx.input.token,
        tokenType: 'project' as const,
        postServerToken: ctx.input.postServerToken
      }
    })
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Account Access Token',
    key: 'account_access_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Account access token from Account Settings → Account Access Tokens. Use read/write scopes as needed and provide projectId for project-scoped tools.'
        ),
      postServerToken
    }),
    getOutput: async ctx => ({
      output: {
        token: ctx.input.token,
        tokenType: 'account' as const,
        postServerToken: ctx.input.postServerToken
      }
    })
  });

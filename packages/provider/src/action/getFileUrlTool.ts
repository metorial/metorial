import { z } from 'zod';
import { AuthConfigSecretRedactor } from '../auth/redact';
import type { SlateContext } from '../context/context';
import type { SlateSpecification } from '../specification/specification';
import { tool } from './tool';

export let GET_FILE_URL_TOOL_ID = 'metorial$getFileUrl';

export let getFileUrlToolInputSchema = z.object({
  url: z.string(),
  reference: z.any().nullable()
});
export type GetFileUrlToolInput = z.infer<typeof getFileUrlToolInputSchema>;

export let getFileUrlToolOutputSchema = z.object({
  url: z.string(),
  expiresAt: z.string(),
  headers: z.record(z.string(), z.string()).optional(),
  query: z.record(z.string(), z.string()).optional()
});
export type GetFileUrlToolOutput = z.infer<typeof getFileUrlToolOutputSchema>;

export type GetFileUrlHandler<ConfigType extends {}, AuthType extends {}> = (
  context: SlateContext<ConfigType, AuthType, GetFileUrlToolInput>
) => Promise<GetFileUrlToolOutput>;

export let getFileUrlTool = <ConfigType extends {}, AuthType extends {}>(
  spec: SlateSpecification<ConfigType, AuthType>,
  handleGetFileUrl: GetFileUrlHandler<ConfigType, AuthType>
) =>
  tool(spec, {
    key: GET_FILE_URL_TOOL_ID,
    name: 'Get File URL',
    description: 'Reserved: refreshes an expiring attachment download URL. Hub-internal only.'
  })
    .input(getFileUrlToolInputSchema)
    .output(getFileUrlToolOutputSchema)
    .handleInvocation(async ctx => {
      let output = await handleGetFileUrl(ctx);
      let redactor = new AuthConfigSecretRedactor(ctx._getAuthConfigForRedaction());

      return {
        output: {
          ...output,
          ...(output.headers ? { headers: redactor.redactEmbedded(output.headers) } : {}),
          ...(output.query ? { query: redactor.redactEmbedded(output.query) } : {})
        },
        message: 'ok'
      };
    })
    .build();

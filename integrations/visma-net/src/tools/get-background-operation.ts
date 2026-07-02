import { createBase64Attachment, SlateTool } from 'slates';
import { z } from 'zod';
import { vismaNetServiceError } from '../lib/errors';
import { backgroundStateSchema, mapBackgroundState } from '../lib/mapping';
import { vismaNetActionScopes } from '../scopes';
import { spec } from '../spec';
import { createVismaNetClient } from './context';

type ToolContext = {
  auth: {
    token: string;
    tenantId?: string;
  };
  config: {
    tenantId: string;
  };
  input: {
    requestId: string;
    includeContent?: boolean;
    fileName?: string;
    mimeType?: string;
  };
};

let createClient = (ctx: ToolContext) => createVismaNetClient(ctx);

export let getBackgroundOperation = SlateTool.create(spec, {
  name: 'Get Background Operation',
  key: 'get_background_operation',
  description:
    'Get the state of a Visma Net background API operation and optionally return its response content as a Slate attachment.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(vismaNetActionScopes.read)
  .input(
    z.object({
      requestId: z.string().describe('Background request ID returned by Visma Net.'),
      includeContent: z
        .boolean()
        .optional()
        .describe(
          'When true, download /v1/background/{requestId}/content as a Slate attachment.'
        ),
      fileName: z.string().optional().describe('Optional filename for background content.'),
      mimeType: z
        .string()
        .optional()
        .describe('Optional MIME type override for background content.')
    })
  )
  .output(
    z.object({
      state: backgroundStateSchema,
      contentMimeType: z.string().optional(),
      contentByteLength: z.number().optional(),
      attachmentCount: z.number()
    })
  )
  .handleInvocation(async (ctx: ToolContext) => {
    let client = createClient(ctx);
    let stateResult = await client.getBackgroundOperation(ctx.input.requestId);
    let state = mapBackgroundState(stateResult.data);

    if (!ctx.input.includeContent) {
      return {
        output: {
          state,
          attachmentCount: 0
        },
        message: `Background operation **${ctx.input.requestId}** status: **${state.status ?? 'unknown'}**.`
      };
    }

    let content = await client.getBackgroundContent(ctx.input.requestId);

    if (!content.body || content.byteLength === undefined) {
      throw vismaNetServiceError('Visma Net did not return background response content.');
    }

    let mimeType = ctx.input.mimeType ?? content.mimeType ?? 'application/octet-stream';
    let fileName =
      ctx.input.fileName ?? content.fileName ?? `visma-net-background-${ctx.input.requestId}`;

    return {
      output: {
        state,
        contentMimeType: mimeType,
        contentByteLength: content.byteLength,
        attachmentCount: 1
      },
      attachments: [createBase64Attachment(content.body, mimeType)],
      message: `Background operation **${ctx.input.requestId}** status: **${state.status ?? 'unknown'}**. Attached response content as **${fileName}**.`
    };
  })
  .build();

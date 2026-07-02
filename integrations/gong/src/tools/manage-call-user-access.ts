import { SlateTool } from 'slates';
import { z } from 'zod';
import { GongClient } from '../lib/client';
import { gongServiceError } from '../lib/errors';
import { spec } from '../spec';

let callAccessSchema = z.object({
  callId: z.string().describe('Gong call ID'),
  userIds: z.array(z.string()).min(1).describe('Gong user IDs')
});

export let manageCallUserAccess = SlateTool.create(spec, {
  name: 'Manage Call User Access',
  key: 'manage_call_user_access',
  description: `Grant, revoke, or retrieve individual user access for Gong calls. This manages only access created through Gong's call user access API.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['get', 'grant', 'revoke'])
        .describe('Whether to retrieve, grant, or revoke individual call access'),
      callIds: z
        .array(z.string())
        .min(1)
        .optional()
        .describe('Call IDs to inspect for action get'),
      callAccessList: z
        .array(callAccessSchema)
        .min(1)
        .optional()
        .describe('Call/user access entries for grant or revoke')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the request completed'),
      callAccessList: z.array(z.any()).optional().describe('Call access details'),
      requestId: z.string().optional().describe('Gong request ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GongClient({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl
    });

    if (ctx.input.action === 'get') {
      if (!ctx.input.callIds || ctx.input.callIds.length === 0) {
        throw gongServiceError('callIds is required for get call user access.');
      }

      let result = await client.getCallUsersAccess({
        filter: {
          callIds: ctx.input.callIds
        }
      });

      return {
        output: {
          success: true,
          callAccessList: result.callAccessList || [],
          requestId: result.requestId
        },
        message: `Retrieved user access for ${ctx.input.callIds.length} Gong call(s).`
      };
    }

    if (!ctx.input.callAccessList || ctx.input.callAccessList.length === 0) {
      throw gongServiceError('callAccessList is required for grant or revoke.');
    }

    let result =
      ctx.input.action === 'grant'
        ? await client.addCallUsersAccess({ callAccessList: ctx.input.callAccessList })
        : await client.deleteCallUsersAccess({ callAccessList: ctx.input.callAccessList });

    return {
      output: {
        success: true,
        requestId: result.requestId
      },
      message: `${ctx.input.action === 'grant' ? 'Granted' : 'Revoked'} Gong call access for ${ctx.input.callAccessList.length} call(s).`
    };
  })
  .build();

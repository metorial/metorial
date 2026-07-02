import { SlateTool } from 'slates';
import { z } from 'zod';
import { GleapClient } from '../lib/client';
import { spec } from '../spec';

export let updateSession = SlateTool.create(spec, {
  name: 'Update Session',
  key: 'update_session',
  description: `Update a session (contact/user) in Gleap. Modify identity info, custom data, tags, and other attributes.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      sessionId: z.string().describe('The session ID to update'),
      userId: z.string().optional().describe('Updated user identifier'),
      email: z.string().optional().describe('Updated email address'),
      name: z.string().optional().describe('Updated name'),
      phone: z.string().optional().describe('Updated phone number'),
      companyId: z.string().optional().describe('Updated company identifier'),
      companyName: z.string().optional().describe('Updated company name'),
      plan: z.string().optional().describe('Updated subscription plan'),
      value: z.number().optional().describe('Updated customer value'),
      customData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom data attributes to update'),
      tags: z.array(z.string()).optional().describe('Updated tags')
    })
  )
  .output(
    z.object({
      session: z.record(z.string(), z.any()).describe('The updated session object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GleapClient({
      token: ctx.auth.token,
      projectId: ctx.auth.projectId
    });

    let { sessionId, ...updateData } = ctx.input;

    let cleanData: Record<string, any> = {};
    for (let [key, value] of Object.entries(updateData)) {
      if (value !== undefined) {
        cleanData[key] = value;
      }
    }

    let session = await client.updateSession(sessionId, cleanData);

    return {
      output: { session },
      message: `Updated session **${sessionId}**.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { HeyGenClient } from '../lib/client';
import { spec } from '../spec';

export const getCurrentUser = SlateTool.create(spec, {
  key: 'get_current_user',
  name: 'Get Current User',
  description: 'Retrieve the authenticated HeyGen account identity and billing details.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      username: z.string(),
      email: z.string().nullable(),
      firstName: z.string().nullable(),
      lastName: z.string().nullable(),
      billingType: z.string().nullable(),
      billing: z.record(z.string(), z.unknown())
    })
  )
  .handleInvocation(async ctx => {
    const user = await new HeyGenClient(ctx.auth).getCurrentUser();
    return {
      output: {
        username: user.username,
        email: user.email ?? null,
        firstName: user.first_name ?? null,
        lastName: user.last_name ?? null,
        billingType: user.billing_type ?? null,
        billing: {
          wallet: user.wallet ?? null,
          subscription: user.subscription ?? null,
          usageBased: user.usage_based ?? null
        }
      },
      message: `Connected as **${user.username}**.`
    };
  })
  .build();

export const listTranslationLanguages = SlateTool.create(spec, {
  key: 'list_translation_languages',
  name: 'List Translation Languages',
  description: 'Discover the exact target language names accepted by translate_video.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(z.object({ languages: z.array(z.string()) }))
  .handleInvocation(async ctx => {
    const result = await new HeyGenClient(ctx.auth).listTranslationLanguages();
    return {
      output: result,
      message: `Found **${result.languages.length}** supported translation languages.`
    };
  })
  .build();

export const getVideoAgentStatus = SlateTool.create(spec, {
  key: 'get_video_agent_status',
  name: 'Get Video Agent Status',
  description:
    'Check a Video Agent session returned by create_video_from_prompt. When videoId is available, call get_video_status to retrieve the completed video.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      sessionId: z.string().min(1).describe('Session ID returned by create_video_from_prompt')
    })
  )
  .output(
    z.object({ sessionId: z.string(), status: z.string(), videoId: z.string().nullable() })
  )
  .handleInvocation(async ctx => {
    const result = await new HeyGenClient(ctx.auth).getVideoAgentStatus(ctx.input.sessionId);
    return {
      output: result,
      message: `Video Agent session **${result.sessionId}** is **${result.status}**.`
    };
  })
  .build();

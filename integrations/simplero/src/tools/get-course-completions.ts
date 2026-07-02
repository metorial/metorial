import { SlateTool } from 'slates';
import { z } from 'zod';
import { SimpleroClient } from '../lib/client';
import { spec } from '../spec';

export let getCourseCompletions = SlateTool.create(spec, {
  name: 'Get Course Completions',
  key: 'get_course_completions',
  description: `Retrieve course completion progress for a contact across all courses in Simplero. Returns a nested structure with courses, modules, and lessons along with their completion status.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().optional().describe('Contact email address'),
      contactId: z.string().optional().describe('Simplero internal contact ID'),
      contactToken: z.string().optional().describe('Simplero contact token')
    })
  )
  .output(
    z.object({
      completions: z
        .record(z.string(), z.unknown())
        .describe('Course completion data with courses, modules, and lessons')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SimpleroClient({
      token: ctx.auth.token,
      userAgent: ctx.config.userAgent
    });

    let completions = await client.getCourseCompletions({
      email: ctx.input.email,
      contactId: ctx.input.contactId,
      contactToken: ctx.input.contactToken
    });

    return {
      output: { completions },
      message: `Retrieved course completion data for contact.`
    };
  })
  .build();

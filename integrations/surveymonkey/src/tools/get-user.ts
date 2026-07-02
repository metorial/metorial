import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description: `Retrieve details about the authenticated SurveyMonkey user, including account type, plan details, and available features.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string(),
      username: z.string().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().optional(),
      accountType: z.string().optional(),
      language: z.string().optional(),
      dateCreated: z.string().optional(),
      dateLastLogin: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accessUrl: ctx.auth.accessUrl
    });

    let user = await client.getCurrentUser();

    return {
      output: {
        userId: user.id,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        accountType: user.account_type,
        language: user.language,
        dateCreated: user.date_created,
        dateLastLogin: user.date_last_login
      },
      message: `Authenticated as **${user.first_name} ${user.last_name}** (${user.email}) — ${user.account_type} plan.`
    };
  })
  .build();

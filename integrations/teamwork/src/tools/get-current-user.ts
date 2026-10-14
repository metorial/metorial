import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Retrieve the authenticated Teamwork user, including their person ID, company, and administrator status.',
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      personId: z.string().describe('Authenticated person ID'),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().optional(),
      companyId: z.string().optional(),
      companyName: z.string().optional(),
      avatarUrl: z.string().optional(),
      isAdmin: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let result = await createClient(ctx).getCurrentUser();
    let person = result.person;
    return {
      output: {
        personId: String(person.id),
        firstName: person['first-name'] || person.firstName || undefined,
        lastName: person['last-name'] || person.lastName || undefined,
        email: person['email-address'] || person.emailAddress || undefined,
        companyId:
          person['company-id'] != null
            ? String(person['company-id'])
            : person.companyId != null
              ? String(person.companyId)
              : undefined,
        companyName: person['company-name'] || person.companyName || undefined,
        avatarUrl: person['avatar-url'] || person.avatarUrl || undefined,
        isAdmin: person.administrator ?? undefined
      },
      message: 'Retrieved the authenticated Teamwork user.'
    };
  })
  .build();

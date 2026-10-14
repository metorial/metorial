import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapMember } from '../lib/member';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Retrieve the Route4Me member associated with the connected API key, including their ID, role, and contact information.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      memberId: z.number().describe('Connected member ID'),
      memberEmail: z.string().optional().describe('Member email'),
      memberFirstName: z.string().optional().describe('First name'),
      memberLastName: z.string().optional().describe('Last name'),
      memberPhone: z.string().optional().describe('Phone number'),
      memberType: z.string().optional().describe('Member type or role'),
      readOnly: z.boolean().optional().describe('Whether the member has read-only access')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let member = mapMember(await client.getUser());
    return {
      output: member,
      message: `Retrieved connected member **${member.memberId}**.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCourses = SlateTool.create(spec, {
  name: 'Get Courses',
  key: 'get_courses',
  description:
    'Retrieve all products from your MemberVault account using the current documented API. Returns the original provider response, including the product IDs needed to grant or revoke access, without assuming undocumented response field names.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      raw: z.unknown().optional().describe('Unmodified product response from MemberVault')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });
    let raw = await client.getCourses();
    return {
      output: { raw },
      message: 'Retrieved the MemberVault product response.'
    };
  })
  .build();

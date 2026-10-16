import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSchoolTool = SlateTool.create(spec, {
  name: 'Get Connected School',
  key: 'get_school',
  description: 'Retrieve the school associated with the connected API key.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({ school: z.any().describe('Unmodified school response for this API key') })
  )
  .handleInvocation(async ctx => {
    let school = await new Client({ token: ctx.auth.token }).getSchool();
    return {
      output: { school },
      message: 'Retrieved the school associated with this API key.'
    };
  })
  .build();

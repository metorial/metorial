import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listProfileFields = SlateTool.create(spec, {
  name: 'List Profile Fields',
  key: 'list_profile_fields',
  description: `Retrieve the profile field definitions (schema) for person records. Returns all sections and fields including their IDs, names, types, and options. Useful for discovering field IDs before creating or updating people.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      profileFields: z
        .array(z.any())
        .describe('Array of profile field sections with their field definitions')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let fields = await client.listProfileFields();
    let fieldsArray = Array.isArray(fields) ? fields : [];

    return {
      output: { profileFields: fieldsArray },
      message: `Retrieved **${fieldsArray.length}** profile field sections.`
    };
  })
  .build();

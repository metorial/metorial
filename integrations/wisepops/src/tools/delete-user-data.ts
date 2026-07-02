import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteUserData = SlateTool.create(spec, {
  name: 'Delete User Data',
  key: 'delete_user_data',
  description: `Delete and suppress end-user data for GDPR/CCPA compliance. Removes all records associated with the provided email and/or phone number. At least one identifier must be provided.
If both email and phone are provided, all records matching **either** identifier will be deleted.`,
  instructions: [
    'Phone numbers must be in international format with a leading "+" and no whitespace, e.g. "+14155552671".'
  ],
  constraints: ['At least one of email or phone must be provided.'],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      email: z
        .string()
        .optional()
        .describe('Email address of the end-user whose data should be deleted.'),
      phone: z
        .string()
        .optional()
        .describe(
          'Phone number in international format (e.g. "+14155552671") of the end-user whose data should be deleted.'
        )
    })
  )
  .output(
    z.object({
      deletedCount: z.number().describe('Number of records deleted.')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.email && !ctx.input.phone) {
      throw new Error('At least one of email or phone must be provided.');
    }

    let client = new Client(ctx.auth.token);

    let result = await client.deleteUserData({
      email: ctx.input.email,
      phone: ctx.input.phone
    });

    return {
      output: { deletedCount: result.deleted },
      message: `Deleted **${result.deleted}** record(s) for the specified user.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import { featureRequestOutputSchema } from './create-feature-request';

export let getFeatureRequestTool = SlateTool.create(spec, {
  name: 'Get Feature Request',
  key: 'get_feature_request',
  description:
    'Retrieve a Beamer feature request by ID, including translations, status, visibility, votes, comments, and requester details.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      requestId: z
        .number()
        .describe('Feature request ID from list_feature_requests or create_feature_request')
    })
  )
  .output(featureRequestOutputSchema)
  .handleInvocation(async ctx => {
    let request = await new Client({ token: ctx.auth.token }).getFeatureRequest(
      ctx.input.requestId
    );
    return {
      output: {
        requestId: request.id,
        date: request.date,
        visible: request.visible,
        category: request.category,
        status: request.status,
        translations: request.translations,
        votesCount: request.votesCount,
        commentsCount: request.commentsCount,
        notes: request.notes,
        filters: request.filters,
        userId: request.userId,
        userEmail: request.userEmail,
        userFirstname: request.userFirstname,
        userLastname: request.userLastname
      },
      message: `Retrieved feature request **#${request.id}**.`
    };
  })
  .build();

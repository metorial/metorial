import { buildApiServiceError, createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleFormsClient } from '../lib/client';
import { googleFormsActionScopes } from '../scopes';
import { spec } from '../spec';

export let setPublishSettings = SlateTool.create(spec, {
  name: 'Set Publish Settings',
  key: 'set_publish_settings',
  description:
    'Publishes or unpublishes a Google Form and controls whether a published form accepts new responses.',
  instructions: [
    'Set both isPublished and isAcceptingResponses. Publish and open a form with true/true, keep it visible but closed with true/false, or unpublish it with false/false.',
    'The tool applies the documented publishState field mask and returns the state reported by Google.'
  ],
  constraints: [
    'A form cannot accept responses while unpublished, so false/true is rejected.',
    'Legacy forms that do not expose publishSettings cannot use this operation.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(googleFormsActionScopes.setPublishSettings)
  .input(
    z.object({
      formId: z.string().describe('The ID of the Google Form to publish or unpublish'),
      isPublished: z
        .boolean()
        .describe('Whether the form is published and visible to responders'),
      isAcceptingResponses: z
        .boolean()
        .describe('Whether the published form accepts new responses')
    })
  )
  .output(
    z.object({
      formId: z.string().describe('ID of the form whose publish settings were updated'),
      isPublished: z.boolean().describe('Whether the form is now published'),
      isAcceptingResponses: z.boolean().describe('Whether the form now accepts new responses')
    })
  )
  .handleInvocation(async ctx => {
    try {
      if (!ctx.input.isPublished && ctx.input.isAcceptingResponses) {
        throw createApiServiceError(
          'A Google Form cannot accept responses while unpublished. Set isAcceptingResponses to false or publish the form.',
          { reason: 'google_forms_invalid_publish_state' }
        );
      }

      let client = new GoogleFormsClient(ctx.auth.token);
      let result = await client.setPublishSettings(ctx.input.formId, {
        isPublished: ctx.input.isPublished,
        isAcceptingResponses: ctx.input.isAcceptingResponses
      });
      let publishState = result.publishSettings?.publishState;
      let isPublished = publishState?.isPublished ?? ctx.input.isPublished;
      let isAcceptingResponses =
        publishState?.isAcceptingResponses ?? ctx.input.isAcceptingResponses;

      return {
        output: {
          formId: result.formId ?? ctx.input.formId,
          isPublished,
          isAcceptingResponses
        },
        message: `Updated publish settings for form \`${result.formId ?? ctx.input.formId}\`: ${
          isPublished ? 'published' : 'unpublished'
        } and ${isAcceptingResponses ? 'accepting responses' : 'not accepting responses'}.`
      };
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Google Forms',
        operation: 'set publish settings',
        reason: 'google_forms_set_publish_settings_failed',
        nestedKeys: ['error', 'errors']
      });
    }
  })
  .build();

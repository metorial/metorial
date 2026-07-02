import { SlateTool } from 'slates';
import { z } from 'zod';
import { ManagementClient } from '../lib/client';
import { spec } from '../spec';

export let manageWorkflow = SlateTool.create(spec, {
  name: 'Manage Workflow',
  key: 'manage_workflow',
  description: `Manages the workflow state of a content item's language variant. Supports publishing, unpublishing, scheduling, creating new versions, changing workflow steps, and cancelling scheduled operations.`,
  instructions: [
    'Use action "publish" to immediately publish a variant, or provide scheduledTo for scheduled publishing.',
    'Use action "unpublish" to unpublish and archive, or provide scheduledTo for scheduled unpublishing.',
    'Use action "create_new_version" to create a new draft from a published variant.',
    'Use action "change_step" with workflowStepId to move to a specific workflow step.',
    'Use action "cancel_scheduled_publish" or "cancel_scheduled_unpublish" to cancel scheduled operations.'
  ]
})
  .input(
    z.object({
      itemIdentifier: z
        .string()
        .describe('The ID, codename, or external ID of the content item'),
      itemIdentifierType: z
        .enum(['id', 'codename', 'external_id'])
        .default('id')
        .describe('Type of item identifier'),
      languageCodename: z.string().describe('Codename of the language variant'),
      action: z
        .enum([
          'publish',
          'unpublish',
          'create_new_version',
          'change_step',
          'cancel_scheduled_publish',
          'cancel_scheduled_unpublish'
        ])
        .describe('The workflow action to perform'),
      scheduledTo: z
        .string()
        .optional()
        .describe(
          'ISO 8601 datetime for scheduled publish/unpublish (e.g., "2024-06-15T12:00:00+00:00")'
        ),
      workflowStepId: z
        .string()
        .optional()
        .describe('Target workflow step ID (required for "change_step" action)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the workflow action was successful'),
      action: z.string().describe('The action that was performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ManagementClient({
      token: ctx.auth.token,
      environmentId: ctx.config.environmentId
    });

    let {
      itemIdentifier,
      itemIdentifierType,
      languageCodename,
      action,
      scheduledTo,
      workflowStepId
    } = ctx.input;

    switch (action) {
      case 'publish':
        await client.publishVariant(
          itemIdentifier,
          itemIdentifierType,
          languageCodename,
          scheduledTo
        );
        break;
      case 'unpublish':
        await client.unpublishAndArchiveVariant(
          itemIdentifier,
          itemIdentifierType,
          languageCodename,
          scheduledTo
        );
        break;
      case 'create_new_version':
        await client.createNewVersion(itemIdentifier, itemIdentifierType, languageCodename);
        break;
      case 'change_step':
        if (!workflowStepId) {
          throw new Error('workflowStepId is required for the "change_step" action');
        }
        await client.changeWorkflowStep(
          itemIdentifier,
          itemIdentifierType,
          languageCodename,
          workflowStepId
        );
        break;
      case 'cancel_scheduled_publish':
        await client.cancelScheduledPublish(
          itemIdentifier,
          itemIdentifierType,
          languageCodename
        );
        break;
      case 'cancel_scheduled_unpublish':
        await client.cancelScheduledUnpublish(
          itemIdentifier,
          itemIdentifierType,
          languageCodename
        );
        break;
    }

    let actionDescription = action.replace(/_/g, ' ');
    if (scheduledTo && (action === 'publish' || action === 'unpublish')) {
      actionDescription = `scheduled ${actionDescription} for ${scheduledTo}`;
    }

    return {
      output: { success: true, action },
      message: `Successfully performed **${actionDescription}** on item \`${itemIdentifier}\` (language: \`${languageCodename}\`).`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getForm = SlateTool.create(spec, {
  name: 'Get Form',
  key: 'get_form',
  description: `Retrieve a single submitted form by its ID. Returns the full form data including all question responses, metadata (device info, timestamps, submitting user), and application details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      formId: z.string().describe('The unique form ID to retrieve')
    })
  )
  .output(
    z.object({
      formId: z.string(),
      appId: z.string(),
      buildId: z.string(),
      domain: z.string(),
      receivedOn: z.string(),
      formType: z.string(),
      formData: z.record(z.string(), z.any()),
      archived: z.boolean(),
      editedOn: z.string().nullable(),
      metadata: z.object({
        appVersion: z.string(),
        deviceId: z.string(),
        instanceId: z.string(),
        timeEnd: z.string(),
        timeStart: z.string(),
        userId: z.string(),
        username: z.string()
      })
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      domain: ctx.config.domain,
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let f = await client.getForm(ctx.input.formId);
    let metadata = f.metadata ?? {};

    return {
      output: {
        formId: f.id,
        appId: f.app_id ?? '',
        buildId: f.build_id ?? '',
        domain: f.domain,
        receivedOn: f.received_on,
        formType: f.type,
        formData: f.form,
        archived: f.archived,
        editedOn: f.edited_on ?? null,
        metadata: {
          appVersion: metadata.appVersion ?? '',
          deviceId: metadata.deviceID ?? '',
          instanceId: metadata.instanceID ?? '',
          timeEnd: metadata.timeEnd ?? '',
          timeStart: metadata.timeStart ?? '',
          userId: metadata.userID ?? '',
          username: metadata.username ?? ''
        }
      },
      message: `Retrieved form **${f.id}** submitted by ${metadata.username ?? 'an unknown user'} on ${f.received_on}.`
    };
  })
  .build();

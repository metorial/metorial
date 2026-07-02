import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTemplate = SlateTool.create(spec, {
  name: 'Get Template',
  key: 'get_template',
  description: `Retrieve the full details of a signature request template including its signer roles, CC roles, form fields, and associated documents.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template to retrieve')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('Unique template identifier'),
      title: z.string().optional().describe('Template title'),
      subject: z.string().optional().describe('Default subject'),
      message: z.string().optional().describe('Default message'),
      signerRoles: z
        .array(
          z.object({
            name: z.string().describe('Role name'),
            order: z.number().optional().describe('Signing order')
          })
        )
        .describe('Defined signer roles'),
      ccRoles: z
        .array(
          z.object({
            name: z.string().describe('CC role name')
          })
        )
        .describe('Defined CC roles'),
      mergeFields: z
        .array(
          z.object({
            name: z.string().describe('Merge field name'),
            type: z.string().describe('Field type (text, checkbox)')
          })
        )
        .optional()
        .describe('Available merge fields for pre-filling'),
      documents: z
        .array(
          z.object({
            name: z.string().optional().describe('Document name'),
            index: z.number().describe('Document index'),
            formFields: z
              .array(
                z.object({
                  apiId: z.string().optional().describe('Form field API ID'),
                  name: z.string().optional().describe('Form field name'),
                  type: z.string().optional().describe('Form field type'),
                  signerIndex: z
                    .number()
                    .optional()
                    .describe('Which signer this field is for'),
                  required: z.boolean().optional().describe('Whether the field is required')
                })
              )
              .optional()
              .describe('Form fields in this document')
          })
        )
        .optional()
        .describe('Documents in the template'),
      canEdit: z.boolean().describe('Whether you can edit this template'),
      isCreator: z.boolean().describe('Whether you created this template')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let result = await client.getTemplate(ctx.input.templateId);

    let signerRoles = (result.signer_roles || []).map((r: any) => ({
      name: r.name,
      order: r.order
    }));

    let ccRoles = (result.cc_roles || []).map((r: any) => ({
      name: r.name
    }));

    let mergeFields = (result.merge_fields || []).map((f: any) => ({
      name: f.name,
      type: f.type
    }));

    let documents = (result.documents || []).map((d: any, idx: number) => ({
      name: d.name,
      index: idx,
      formFields: (d.form_fields || []).map((ff: any) => ({
        apiId: ff.api_id,
        name: ff.name,
        type: ff.type,
        signerIndex: ff.signer,
        required: ff.required
      }))
    }));

    return {
      output: {
        templateId: result.template_id,
        title: result.title,
        subject: result.subject,
        message: result.message,
        signerRoles,
        ccRoles,
        mergeFields,
        documents,
        canEdit: result.can_edit ?? false,
        isCreator: result.is_creator ?? false
      },
      message: `Template **"${result.title || result.template_id}"** with ${signerRoles.length} signer role(s) and ${mergeFields.length} merge field(s).`
    };
  })
  .build();

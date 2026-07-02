import { SlateTool } from 'slates';
import { z } from 'zod';
import { CertCentralClient } from '../lib/client';
import { spec } from '../spec';

let contactSchema = z
  .object({
    firstName: z.string().describe('Contact first name'),
    lastName: z.string().describe('Contact last name'),
    email: z.string().optional().describe('Contact email'),
    jobTitle: z.string().optional().describe('Contact job title'),
    telephone: z.string().optional().describe('Contact phone number')
  })
  .optional();

export let manageOrganization = SlateTool.create(spec, {
  name: 'Manage Organization',
  key: 'manage_organization',
  description: `Create, update, or retrieve an organization in DigiCert CertCentral. Organizations must be created and validated before ordering OV or EV certificates. Also supports submitting an organization for validation.`,
  instructions: [
    'To create, set action to "create" and provide required organization details (name, address, phone, country).',
    'To update, set action to "update" with the organization ID and fields to change.',
    'To retrieve, set action to "get" with the organization ID.',
    'To submit for validation, set action to "submit_for_validation" with the organization ID and validation types.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'get', 'submit_for_validation'])
        .describe('Operation to perform'),
      organizationId: z
        .string()
        .optional()
        .describe('Organization ID (required for get, update, submit_for_validation)'),
      name: z.string().optional().describe('Legal organization name'),
      assumedName: z.string().optional().describe('DBA or assumed name'),
      address: z.string().optional().describe('Street address'),
      address2: z.string().optional().describe('Street address line 2'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State or province'),
      zip: z.string().optional().describe('Postal/ZIP code'),
      country: z.string().optional().describe('ISO 3166-1 alpha-2 country code'),
      telephone: z.string().optional().describe('Organization phone number'),
      organizationContact: contactSchema.describe('Primary organization contact'),
      validationTypes: z
        .array(z.enum(['ov', 'ev', 'cs', 'ev_cs']))
        .optional()
        .describe('Validation types to submit for'),
      includeValidation: z
        .boolean()
        .optional()
        .describe('Include validation status when getting details')
    })
  )
  .output(
    z.object({
      organizationId: z.number().describe('Organization ID'),
      name: z.string().optional().describe('Organization name'),
      status: z.string().optional().describe('Organization status'),
      isActive: z.boolean().optional().describe('Whether active'),
      validations: z
        .array(
          z.object({
            type: z.string(),
            status: z.string(),
            validatedUntil: z.string().optional()
          })
        )
        .optional()
        .describe('Validation status'),
      actionPerformed: z.string().describe('Description of the action performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CertCentralClient({
      token: ctx.auth.token,
      platform: ctx.config.platform
    });

    let { action } = ctx.input;

    let buildOrgBody = () => {
      let body: Record<string, any> = {};
      if (ctx.input.name) body.name = ctx.input.name;
      if (ctx.input.assumedName) body.assumed_name = ctx.input.assumedName;
      if (ctx.input.address) body.address = ctx.input.address;
      if (ctx.input.address2) body.address2 = ctx.input.address2;
      if (ctx.input.city) body.city = ctx.input.city;
      if (ctx.input.state) body.state = ctx.input.state;
      if (ctx.input.zip) body.zip = ctx.input.zip;
      if (ctx.input.country) body.country = ctx.input.country;
      if (ctx.input.telephone) body.telephone = ctx.input.telephone;
      if (ctx.input.organizationContact) {
        body.organization_contact = {
          first_name: ctx.input.organizationContact.firstName,
          last_name: ctx.input.organizationContact.lastName,
          email: ctx.input.organizationContact.email,
          job_title: ctx.input.organizationContact.jobTitle,
          telephone: ctx.input.organizationContact.telephone
        };
      }
      return body;
    };

    if (action === 'create') {
      if (!ctx.input.name || !ctx.input.country) {
        throw new Error('Organization name and country are required when creating');
      }

      ctx.progress('Creating organization...');
      let result = await client.createOrganization(buildOrgBody());

      return {
        output: {
          organizationId: result.id,
          name: ctx.input.name,
          actionPerformed: 'created'
        },
        message: `Organization **${ctx.input.name}** created (ID: ${result.id}).`
      };
    }

    if (!ctx.input.organizationId) {
      throw new Error('organizationId is required for this action');
    }

    if (action === 'update') {
      ctx.progress('Updating organization...');
      await client.updateOrganization(ctx.input.organizationId, buildOrgBody());

      return {
        output: {
          organizationId: Number(ctx.input.organizationId),
          name: ctx.input.name,
          actionPerformed: 'updated'
        },
        message: `Organization **${ctx.input.organizationId}** updated.`
      };
    }

    if (action === 'get') {
      let org = await client.getOrganization(ctx.input.organizationId, {
        include_validation: ctx.input.includeValidation
      });

      return {
        output: {
          organizationId: org.id,
          name: org.name,
          status: org.status,
          isActive: org.is_active,
          validations: org.validations?.map((v: any) => ({
            type: v.type,
            status: v.status,
            validatedUntil: v.validated_until
          })),
          actionPerformed: 'retrieved'
        },
        message: `Organization **${org.name}** (ID: ${org.id}) — status: ${org.status || 'N/A'}`
      };
    }

    if (action === 'submit_for_validation') {
      if (!ctx.input.validationTypes || ctx.input.validationTypes.length === 0) {
        throw new Error('validationTypes are required when submitting for validation');
      }

      ctx.progress('Submitting organization for validation...');
      await client.submitOrganizationForValidation(ctx.input.organizationId, {
        validations: ctx.input.validationTypes.map(t => ({ type: t }))
      });

      return {
        output: {
          organizationId: Number(ctx.input.organizationId),
          actionPerformed: 'submitted_for_validation'
        },
        message: `Organization **${ctx.input.organizationId}** submitted for **${ctx.input.validationTypes.join(', ')}** validation.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();

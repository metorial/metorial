import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createCertificate = SlateTool.create(spec, {
  name: 'Create Certificate',
  key: 'create_certificate',
  description: `Create a certificate code for a package or coupon. Provide either a product ID (for packages) or a coupon ID (for coupons). Optionally specify a custom certificate code and assign it to an email.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      productId: z
        .number()
        .optional()
        .describe('Package product ID to create a certificate for'),
      couponId: z.number().optional().describe('Coupon ID to create a certificate for'),
      certificate: z
        .string()
        .optional()
        .describe('Custom certificate code (auto-generated if omitted)'),
      email: z.string().optional().describe('Email to assign the certificate to')
    })
  )
  .output(
    z.object({
      certificateId: z.number().describe('Certificate ID'),
      certificate: z.string().describe('Certificate code'),
      name: z.string().describe('Certificate name'),
      type: z.string().describe('Certificate type'),
      email: z.string().optional().describe('Assigned email'),
      appointmentTypeIds: z.array(z.number()).optional().describe('Valid appointment type IDs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let c = await client.createCertificate({
      productID: ctx.input.productId,
      couponID: ctx.input.couponId,
      certificate: ctx.input.certificate,
      email: ctx.input.email
    });

    return {
      output: {
        certificateId: c.id,
        certificate: c.certificate || '',
        name: c.name || '',
        type: c.type || '',
        email: c.email || undefined,
        appointmentTypeIds: c.appointmentTypeIDs || undefined
      },
      message: `Certificate **${c.certificate}** created (ID: **#${c.id}**).`
    };
  })
  .build();

export let checkCertificate = SlateTool.create(spec, {
  name: 'Check Certificate',
  key: 'check_certificate',
  description: `Validate a certificate or coupon code. Optionally check against a specific appointment type to verify eligibility.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      certificate: z.string().describe('The certificate or coupon code to validate'),
      appointmentTypeId: z
        .number()
        .optional()
        .describe('Appointment type ID to check eligibility against')
    })
  )
  .output(
    z.object({
      certificateId: z.number().describe('Certificate ID'),
      certificate: z.string().describe('Certificate code'),
      name: z.string().describe('Certificate name'),
      type: z.string().describe('Certificate type'),
      appointmentTypeIds: z.array(z.number()).optional().describe('Valid appointment type IDs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let c = await client.checkCertificate({
      certificate: ctx.input.certificate,
      appointmentTypeID: ctx.input.appointmentTypeId
    });

    return {
      output: {
        certificateId: c.id,
        certificate: c.certificate || '',
        name: c.name || '',
        type: c.type || '',
        appointmentTypeIds: c.appointmentTypeIDs || undefined
      },
      message: `Certificate **${c.certificate}** is valid (type: **${c.type}**).`
    };
  })
  .build();

export let deleteCertificate = SlateTool.create(spec, {
  name: 'Delete Certificate',
  key: 'delete_certificate',
  description: `Delete a certificate by ID.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      certificateId: z.number().describe('The ID of the certificate to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the certificate was deleted successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    await client.deleteCertificate(ctx.input.certificateId);

    return {
      output: { success: true },
      message: `Certificate **#${ctx.input.certificateId}** deleted.`
    };
  })
  .build();

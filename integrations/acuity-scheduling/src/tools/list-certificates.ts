import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

type Certificate = {
  id?: number;
  certificate: string;
  name?: string;
  type?: string;
  email?: string;
  appointmentTypeIDs?: number[];
};

export let listCertificates = SlateTool.create(spec, {
  name: 'List Certificates',
  key: 'list_certificates',
  description:
    'Find package certificate codes by client email, product, order, or appointment type. Combine email and appointment type to discover valid codes for a client before booking.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      productId: z.number().optional().describe('Product ID from list_products'),
      orderId: z.number().optional().describe('Order ID from list_orders'),
      appointmentTypeId: z
        .number()
        .optional()
        .describe('Appointment type ID from list_appointment_types'),
      email: z.string().optional().describe('Client email to find valid package codes for')
    })
  )
  .output(
    z.object({
      certificates: z.array(
        z.object({
          certificateId: z.number().optional().describe('Certificate ID, when returned'),
          certificate: z.string().describe('Certificate code for booking or validation'),
          name: z.string().optional().describe('Certificate name'),
          type: z.string().optional().describe('Certificate type'),
          email: z.string().optional().describe('Assigned client email'),
          appointmentTypeIds: z
            .array(z.number())
            .optional()
            .describe('Eligible appointment type IDs')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let results: Certificate[] = await client.listCertificates({
      productID: ctx.input.productId,
      orderID: ctx.input.orderId,
      appointmentTypeID: ctx.input.appointmentTypeId,
      email: ctx.input.email
    });
    let certificates = results.map(certificate => ({
      certificateId: certificate.id,
      certificate: certificate.certificate,
      name: certificate.name,
      type: certificate.type,
      email: certificate.email,
      appointmentTypeIds: certificate.appointmentTypeIDs
    }));
    return {
      output: { certificates },
      message: `Found **${certificates.length}** package certificate(s).`
    };
  })
  .build();

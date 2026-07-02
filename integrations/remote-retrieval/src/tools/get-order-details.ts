import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let orderDetailSchema = z.object({
  orderId: z.number().describe('Unique order identifier'),
  employeeInfo: z.object({
    email: z.string().describe('Employee email'),
    name: z.string().describe('Employee name'),
    addressLine1: z.string().describe('Employee street address'),
    addressLine2: z.string().optional().describe('Employee address line 2'),
    city: z.string().describe('Employee city'),
    state: z.string().describe('Employee state'),
    zip: z.string().describe('Employee ZIP code')
  }),
  companyInfo: z.object({
    email: z.string().describe('Company contact email'),
    name: z.string().describe('Return contact name'),
    addressLine1: z.string().describe('Company street address'),
    addressLine2: z.string().optional().describe('Company address line 2'),
    city: z.string().describe('Company city'),
    state: z.string().describe('Company state'),
    zip: z.string().describe('Company ZIP code')
  }),
  shipments: z.object({
    deviceType: z.string().describe('Type of device being returned'),
    sendStatus: z.string().describe('Status of the box shipped to employee'),
    returnStatus: z.string().describe('Status of the device shipped back to company')
  })
});

export let getOrderDetails = SlateTool.create(spec, {
  name: 'Get Order Details',
  key: 'get_order_details',
  description: `Retrieve detailed information for a specific equipment return order by its order ID. Returns employee and company details, device type, and full shipment tracking status for both outbound (box to employee) and return (device to company) shipments.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      orderId: z.string().describe('The order ID to retrieve details for')
    })
  )
  .output(
    z.object({
      orderDetails: z.array(orderDetailSchema).describe('Order detail records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getOrderDetails(ctx.input.orderId);

    let details = (Array.isArray(result) ? result : [result]).map((item: any) => ({
      orderId: item.order_id,
      employeeInfo: {
        email: item.employee_info?.email || '',
        name: item.employee_info?.name || '',
        addressLine1: item.employee_info?.address_line_1 || '',
        addressLine2: item.employee_info?.address_line_2 || undefined,
        city: item.employee_info?.city || '',
        state: item.employee_info?.state || '',
        zip: item.employee_info?.zip || ''
      },
      companyInfo: {
        email: item.company_info?.email || '',
        name: item.company_info?.name || '',
        addressLine1: item.company_info?.address_line_1 || '',
        addressLine2: item.company_info?.address_line_2 || undefined,
        city: item.company_info?.city || '',
        state: item.company_info?.state || '',
        zip: item.company_info?.zip || ''
      },
      shipments: {
        deviceType: item.shipments?.device_type || '',
        sendStatus: item.shipments?.send_status || '',
        returnStatus: item.shipments?.return_status || ''
      }
    }));

    return {
      output: {
        orderDetails: details
      },
      message: `Retrieved details for order **#${ctx.input.orderId}** with ${details.length} shipment(s).`
    };
  })
  .build();

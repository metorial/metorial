import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let employeeInfoSchema = z.object({
  email: z.string().describe('Employee email address'),
  name: z.string().describe('Employee full name'),
  addressLine1: z.string().describe('Employee street address'),
  addressLine2: z.string().optional().describe('Employee address line 2 (apt, suite, etc.)'),
  city: z.string().describe('Employee city'),
  state: z.string().describe('Employee state (2-letter code, e.g. TX)'),
  country: z.string().describe('Employee country (e.g. United States)'),
  zip: z.string().describe('Employee ZIP/postal code'),
  phone: z.string().describe('Employee phone number (digits only, e.g. 1231231234)')
});

let companyInfoSchema = z.object({
  returnPersonName: z.string().describe('Name of the person receiving the return'),
  returnCompanyName: z.string().describe('Company name'),
  returnAddressLine1: z.string().describe('Company return street address'),
  returnAddressLine2: z.string().optional().describe('Company return address line 2'),
  returnCity: z.string().describe('Company return city'),
  returnState: z.string().describe('Company return state (2-letter code)'),
  returnCountry: z.string().describe('Company return country'),
  returnZip: z.string().describe('Company return ZIP/postal code'),
  email: z.string().describe('Company contact email'),
  phone: z.string().describe('Company contact phone number')
});

let newEmployeeInfoSchema = z.object({
  firstName: z.string().describe('New employee first name'),
  lastName: z.string().describe('New employee last name'),
  phone: z.string().describe('New employee phone number'),
  email: z.string().describe('New employee email address'),
  addressLine1: z.string().describe('New employee street address'),
  city: z.string().describe('New employee city'),
  state: z.string().describe('New employee state'),
  zip: z.string().describe('New employee ZIP/postal code'),
  country: z.string().describe('New employee country'),
  welcomeMessage: z
    .string()
    .optional()
    .describe('Optional welcome message for the new employee')
});

let orderSchema = z.object({
  equipmentType: z
    .enum(['Laptop', 'Monitor', 'Cell Phone', 'Tablet'])
    .describe('Type of equipment to return'),
  orderType: z
    .enum(['Return To Company', 'Recycle with Data Destruction'])
    .describe('Type of return order'),
  additionalService: z
    .enum(['data_destruction_return', 'data_destruction_forward'])
    .optional()
    .describe(
      'Additional service for "Return To Company" orders: "data_destruction_return" wipes data and returns to company, "data_destruction_forward" wipes data and ships to a new employee'
    ),
  insuranceActive: z
    .boolean()
    .optional()
    .describe('Whether to enable insurance for this order'),
  insuranceAmount: z
    .number()
    .optional()
    .describe('Insurance value amount (required when insurance is active)'),
  employeeInfo: employeeInfoSchema.describe(
    'Information about the employee returning the equipment'
  ),
  companyInfo: companyInfoSchema.describe('Company return address and contact information'),
  newEmployeeInfo: newEmployeeInfoSchema
    .optional()
    .describe(
      'Required when additionalService is "data_destruction_forward" — info for the new employee receiving the device'
    )
});

export let createOrder = SlateTool.create(spec, {
  name: 'Create Return Order',
  key: 'create_return_order',
  description: `Create one or more equipment return orders for remote employees. Supports returning laptops, monitors, cell phones, and tablets.
Orders can be either "Return To Company" (with optional data destruction services) or "Recycle with Data Destruction".
When using "Return To Company", you can optionally add data destruction with return to company, or data destruction with forwarding to a new employee.`,
  instructions: [
    'When additionalService is "data_destruction_forward", newEmployeeInfo is required for each order using that service.',
    'Insurance requires both insuranceActive=true and a positive insuranceAmount.',
    'additionalService is only applicable when orderType is "Return To Company".'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      orders: z
        .array(orderSchema)
        .min(1)
        .describe('One or more equipment return orders to create')
    })
  )
  .output(
    z.object({
      orderId: z.string().describe('The created order ID'),
      message: z.string().describe('Confirmation message from the API'),
      status: z.string().describe('Response status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let payloadOrders = ctx.input.orders.map(order => {
      let additionalServiceValue: 1 | 2 | undefined;
      if (order.additionalService === 'data_destruction_return') {
        additionalServiceValue = 1;
      } else if (order.additionalService === 'data_destruction_forward') {
        additionalServiceValue = 2;
      }

      let payload: Record<string, unknown> = {
        type_of_equipment: order.equipmentType,
        order_type: order.orderType,
        employee_info: {
          email: order.employeeInfo.email,
          name: order.employeeInfo.name,
          address_line_1: order.employeeInfo.addressLine1,
          address_line_2: order.employeeInfo.addressLine2 || '',
          address_city: order.employeeInfo.city,
          address_state: order.employeeInfo.state,
          address_country: order.employeeInfo.country,
          address_zip: order.employeeInfo.zip,
          phone: order.employeeInfo.phone
        },
        company_info: {
          return_person_name: order.companyInfo.returnPersonName,
          return_company_name: order.companyInfo.returnCompanyName,
          return_address_line_1: order.companyInfo.returnAddressLine1,
          return_address_line_2: order.companyInfo.returnAddressLine2 || '',
          return_address_city: order.companyInfo.returnCity,
          return_address_state: order.companyInfo.returnState,
          return_address_country: order.companyInfo.returnCountry,
          return_address_zip: order.companyInfo.returnZip,
          email: order.companyInfo.email,
          phone: order.companyInfo.phone
        }
      };

      if (additionalServiceValue !== undefined) {
        payload.return_add_srv = additionalServiceValue;
      }

      if (order.insuranceActive) {
        payload.ins_active = 1;
        if (order.insuranceAmount !== undefined) {
          payload.ins_amount = order.insuranceAmount;
        }
      }

      if (order.newEmployeeInfo && additionalServiceValue === 2) {
        payload.new_employee_info = {
          first_name: order.newEmployeeInfo.firstName,
          last_name: order.newEmployeeInfo.lastName,
          phone: order.newEmployeeInfo.phone,
          email: order.newEmployeeInfo.email,
          address_line_1: order.newEmployeeInfo.addressLine1,
          address_city: order.newEmployeeInfo.city,
          address_state: order.newEmployeeInfo.state,
          address_zip: order.newEmployeeInfo.zip,
          address_country: order.newEmployeeInfo.country,
          newemp_msg: order.newEmployeeInfo.welcomeMessage || ''
        };
      }

      return payload;
    });

    let result = await client.createOrder(payloadOrders as any);

    return {
      output: {
        orderId: String(result.order),
        message: result.message,
        status: result.status
      },
      message: `Successfully created order **#${result.order}** for ${ctx.input.orders.length} device(s).`
    };
  })
  .build();

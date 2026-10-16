import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  requestAxiosData
} from 'slates';
import { z } from 'zod';

let userSchema = z.object({
  email: z.string(),
  message: z.string(),
  status: z.string(),
  response_code: z.number()
});

let createOrderResponseSchema = z.object({
  order: z.union([z.string(), z.number()]),
  message: z.string(),
  status: z.string()
});

let contactSchema = z.object({
  email: z.string(),
  name: z.string(),
  address_line_1: z.string(),
  address_line_2: z.string().optional(),
  city: z.string(),
  state: z.string(),
  zip: z.string()
});

let orderDetailSchema = z.object({
  order_id: z.number(),
  employee_info: contactSchema,
  company_info: contactSchema,
  shipments: z.object({
    device_type: z.string(),
    send_status: z.string(),
    return_status: z.string()
  })
});

let orderSchema = orderDetailSchema.extend({
  payment_status: z.string(),
  order_status: z.string()
});

let orderPageSchema = z.object({
  results: z.array(orderSchema),
  next: z.string().nullable(),
  previous: z.string().nullable()
});

let companySchema = z.object({
  company_name: z.string(),
  company_email: z.string(),
  address_1: z.string(),
  address_2: z.string().nullable(),
  city: z.string(),
  state: z.string(),
  zip: z.string(),
  created_date: z.string()
});

let pricesSchema = z.array(
  z.object({
    equipment_type: z.string(),
    order_amount: z.number(),
    option_lbl: z.string()
  })
);

export let mapOrderDetails = (order: z.infer<typeof orderDetailSchema>) => ({
  orderId: order.order_id,
  employeeInfo: {
    email: order.employee_info.email,
    name: order.employee_info.name,
    addressLine1: order.employee_info.address_line_1,
    addressLine2: order.employee_info.address_line_2,
    city: order.employee_info.city,
    state: order.employee_info.state,
    zip: order.employee_info.zip
  },
  companyInfo: {
    email: order.company_info.email,
    name: order.company_info.name,
    addressLine1: order.company_info.address_line_1,
    addressLine2: order.company_info.address_line_2,
    city: order.company_info.city,
    state: order.company_info.state,
    zip: order.company_info.zip
  },
  shipments: {
    deviceType: order.shipments.device_type,
    sendStatus: order.shipments.send_status,
    returnStatus: order.shipments.return_status
  }
});

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;
  private token: string;

  constructor(params: { token: string }) {
    if (!params.token.trim()) {
      throw createApiServiceError(
        'A Remote Retrieval API key is required. Reconnect your account.'
      );
    }
    this.token = params.token.trim();
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://www.remoteretrieval.com',
      authHeader: { value: `Bearer ${this.token}` },
      timeout: 30_000
    });
  }

  private apiError = (error: unknown, operation: string) =>
    buildApiServiceError(error, {
      providerLabel: 'Remote Retrieval',
      reason: 'remote_retrieval_api_error',
      operation,
      extractResponse: (value, helpers) => {
        let response = helpers.getResponseWithBody(value);
        if (!response) return undefined;
        let status = response.status;
        return {
          ...response,
          status:
            typeof status === 'number' ||
            (typeof status === 'string' && /^\d{3}$/.test(status))
              ? status
              : undefined
        };
      },
      extractMessage: (value, helpers) => {
        let response = helpers.getResponseWithBody(value);
        let message = helpers.extractMessage(response ? { response } : value);
        return message
          .split(this.token)
          .join('[redacted]')
          .split(encodeURIComponent(this.token))
          .join('[redacted]');
      },
      formatMessage: ({ providerLabel, operation, statusLabel, message }) =>
        `${providerLabel} API ${operation} failed: ${statusLabel}${message}`
          .split(this.token)
          .join('[redacted]')
          .split(encodeURIComponent(this.token))
          .join('[redacted]'),
      // Transport errors can retain authenticated request data in their parent.
      parent: {}
    });

  private async request<T>(
    operation: string,
    send: () => ReturnType<typeof this.axios.get<unknown>>,
    schema: z.ZodType<T>
  ): Promise<T> {
    let data = await requestAxiosData<unknown>(operation, send, this.apiError);
    if (isApiErrorRecord(data)) {
      let code = data.response_code;
      let failedCode =
        (typeof code === 'number' || typeof code === 'string') && Number(code) >= 400;
      let failedStatus =
        data.status === false ||
        (typeof data.status === 'string' && data.status.toLowerCase() !== 'success');
      if (failedCode || failedStatus || (data.error !== undefined && data.error !== null)) {
        throw this.apiError({ response: { data, status: code } }, operation);
      }
    }
    let parsed = schema.safeParse(data);
    if (!parsed.success) {
      throw createApiServiceError(
        `Remote Retrieval returned an invalid response for ${operation}. Required fields were missing or had unexpected types.`,
        { reason: 'remote_retrieval_invalid_response' }
      );
    }
    return parsed.data;
  }

  validateUser() {
    return this.request(
      'validate user',
      () => this.axios.get('/api/v1/validate/user'),
      userSchema
    );
  }

  createOrder(orders: CreateOrderPayload[]) {
    return this.request(
      'create order',
      () => this.axios.post('/api/v1/create-order', { orders }),
      createOrderResponseSchema
    );
  }

  createOrderByCsv(csvContent: string) {
    if (!csvContent.trim()) {
      throw createApiServiceError(
        'Provide CSV content using the Remote Retrieval order template.'
      );
    }
    let form = new FormData();
    form.append('order_file', new Blob([csvContent], { type: 'text/csv' }), 'orders.csv');
    return this.request(
      'create orders from CSV',
      () =>
        this.axios.post('/api/v1/create-order-by-csv', form, {
          headers: { 'Content-Type': 'multipart/form-data' }
        }),
      createOrderResponseSchema
    );
  }

  getOrders(cursor?: string) {
    return this.request(
      'list orders',
      () => this.axios.get('/api/v1/orders', { params: { cursor } }),
      orderPageSchema
    );
  }

  getOrderDetails(orderId: string) {
    if (!orderId.trim()) {
      throw createApiServiceError('Provide an order ID from list_orders.');
    }
    return this.request(
      'get order details',
      () => this.axios.get('/api/v1/device_returns', { params: { oid: orderId } }),
      z.union([z.array(orderDetailSchema), orderDetailSchema])
    );
  }

  getCompanyDetails() {
    return this.request(
      'get company details',
      () => this.axios.get('/api/v1/company-details'),
      companySchema
    );
  }

  getDevicePrices() {
    return this.request(
      'get device prices',
      () => this.axios.get('/api/v1/get-device-prices'),
      pricesSchema
    );
  }
}

export interface EmployeeInfo {
  email: string;
  name: string;
  address_line_1: string;
  address_line_2?: string;
  address_city: string;
  address_state: string;
  address_country: string;
  address_zip: string;
  phone: string;
}

export interface CompanyInfo {
  return_person_name: string;
  return_company_name: string;
  return_address_line_1: string;
  return_address_line_2?: string;
  return_address_city: string;
  return_address_state: string;
  return_address_country: string;
  return_address_zip: string;
  email: string;
  phone: string;
}

export interface NewEmployeeInfo {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  address_line_1: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  address_country: string;
  newemp_msg?: string;
}

export interface CreateOrderPayload {
  type_of_equipment: 'Laptop' | 'Monitor' | 'Cell Phone' | 'Tablet';
  order_type: 'Return To Company' | 'Recycle with Data Destruction';
  return_add_srv?: 1 | 2;
  ins_active?: 0 | 1;
  ins_amount?: number;
  employee_info: EmployeeInfo;
  company_info: CompanyInfo;
  new_employee_info?: NewEmployeeInfo;
}

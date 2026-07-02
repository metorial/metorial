import { createAxios } from 'slates';

export class Client {
  private axios;

  constructor(params: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://www.remoteretrieval.com',
      headers: {
        Authorization: `Bearer ${params.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async validateUser() {
    let response = await this.axios.get('/api/v1/validate/user');
    return response.data;
  }

  async createOrder(orders: CreateOrderPayload[]) {
    let response = await this.axios.post('/api/v1/create-order', { orders });
    return response.data;
  }

  async createOrderByCsv(orderFile: string) {
    let response = await this.axios.post('/api/v1/create-order-by-csv', {
      order_file: orderFile
    });
    return response.data;
  }

  async getOrders(cursor?: string) {
    let url = '/api/v1/orders';
    if (cursor) {
      url += `?cursor=${encodeURIComponent(cursor)}`;
    }
    let response = await this.axios.get(url);
    return response.data;
  }

  async getAllOrders() {
    let allResults: OrderResult[] = [];
    let cursor: string | undefined;

    do {
      let response = await this.getOrders(cursor);
      if (response.results) {
        allResults.push(...response.results);
      }
      cursor = response.next || undefined;
    } while (cursor);

    return allResults;
  }

  async getOrderDetails(orderId: string) {
    let response = await this.axios.get(
      `/api/v1/device_returns?oid=${encodeURIComponent(orderId)}`
    );
    return response.data;
  }

  async getCompanyDetails() {
    let response = await this.axios.get('/api/v1/company-details');
    return response.data;
  }

  async getDevicePrices() {
    let response = await this.axios.get('/api/v1/get-device-prices');
    return response.data;
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

export interface OrderShipment {
  device_type: string;
  send_status: string;
  return_status: string;
}

export interface OrderResult {
  order_id: number;
  payment_status: string;
  order_status: string;
  employee_info: {
    email: string;
    name: string;
    address_line_1: string;
    address_line_2: string;
    city: string;
    state: string;
    zip: string;
  };
  company_info: {
    email: string;
    name: string;
    address_line_1: string;
    address_line_2: string;
    city: string;
    state: string;
    zip: string;
  };
  shipments: OrderShipment;
}

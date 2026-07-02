import { createAxios } from 'slates';

export class Client {
  private axios;

  constructor(private config: { token: string; subdomain: string }) {
    this.axios = createAxios({
      baseURL: `https://${config.subdomain}.repairshopr.com/api/v1`
    });
  }

  private params(extra: Record<string, any> = {}) {
    let cleaned: Record<string, any> = { api_key: this.config.token };
    for (let [key, value] of Object.entries(extra)) {
      if (value !== undefined && value !== null) {
        cleaned[key] = value;
      }
    }
    return cleaned;
  }

  // ── Customers ──

  async listCustomers(params?: {
    query?: string;
    firstname?: string;
    lastname?: string;
    businessName?: string;
    email?: string;
    includeDisabled?: boolean;
    sort?: string;
    page?: number;
  }) {
    let response = await this.axios.get('/customers', {
      params: this.params({
        query: params?.query,
        firstname: params?.firstname,
        lastname: params?.lastname,
        business_name: params?.businessName,
        email: params?.email,
        include_disabled: params?.includeDisabled,
        sort: params?.sort,
        page: params?.page
      })
    });
    return response.data;
  }

  async getCustomer(customerId: number) {
    let response = await this.axios.get(`/customers/${customerId}`, {
      params: this.params()
    });
    return response.data;
  }

  async createCustomer(data: {
    firstname?: string;
    lastname?: string;
    businessName?: string;
    email?: string;
    phone?: string;
    mobile?: string;
    address?: string;
    address2?: string;
    city?: string;
    state?: string;
    zip?: string;
    notes?: string;
    getSms?: boolean;
    optOut?: boolean;
    noEmail?: boolean;
    locationName?: string;
    referredBy?: string;
  }) {
    let response = await this.axios.post(
      '/customers',
      {
        firstname: data.firstname,
        lastname: data.lastname,
        business_name: data.businessName,
        email: data.email,
        phone: data.phone,
        mobile: data.mobile,
        address: data.address,
        address_2: data.address2,
        city: data.city,
        state: data.state,
        zip: data.zip,
        notes: data.notes,
        get_sms: data.getSms,
        opt_out: data.optOut,
        no_email: data.noEmail,
        location_name: data.locationName,
        referred_by: data.referredBy
      },
      {
        params: this.params()
      }
    );
    return response.data;
  }

  async updateCustomer(customerId: number, data: Record<string, any>) {
    let body: Record<string, any> = {};
    let fieldMap: Record<string, string> = {
      firstname: 'firstname',
      lastname: 'lastname',
      businessName: 'business_name',
      email: 'email',
      phone: 'phone',
      mobile: 'mobile',
      address: 'address',
      address2: 'address_2',
      city: 'city',
      state: 'state',
      zip: 'zip',
      notes: 'notes',
      getSms: 'get_sms',
      optOut: 'opt_out',
      noEmail: 'no_email',
      locationName: 'location_name',
      referredBy: 'referred_by'
    };
    for (let [camel, snake] of Object.entries(fieldMap)) {
      if (data[camel] !== undefined) {
        body[snake] = data[camel];
      }
    }
    let response = await this.axios.put(`/customers/${customerId}`, body, {
      params: this.params()
    });
    return response.data;
  }

  async deleteCustomer(customerId: number) {
    let response = await this.axios.delete(`/customers/${customerId}`, {
      params: this.params()
    });
    return response.data;
  }

  // ── Contacts ──

  async listContacts(params?: { customerId?: number; page?: number }) {
    let response = await this.axios.get('/contacts', {
      params: this.params({
        customer_id: params?.customerId,
        page: params?.page
      })
    });
    return response.data;
  }

  async getContact(contactId: number) {
    let response = await this.axios.get(`/contacts/${contactId}`, {
      params: this.params()
    });
    return response.data;
  }

  async createContact(data: {
    customerId: number;
    name?: string;
    email?: string;
    phone?: string;
    mobile?: string;
    address1?: string;
    address2?: string;
    city?: string;
    state?: string;
    zip?: string;
    notes?: string;
  }) {
    let response = await this.axios.post(
      '/contacts',
      {
        customer_id: data.customerId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        mobile: data.mobile,
        address1: data.address1,
        address2: data.address2,
        city: data.city,
        state: data.state,
        zip: data.zip,
        notes: data.notes
      },
      {
        params: this.params()
      }
    );
    return response.data;
  }

  async updateContact(contactId: number, data: Record<string, any>) {
    let body: Record<string, any> = {};
    let fieldMap: Record<string, string> = {
      name: 'name',
      customerId: 'customer_id',
      email: 'email',
      phone: 'phone',
      mobile: 'mobile',
      address1: 'address1',
      address2: 'address2',
      city: 'city',
      state: 'state',
      zip: 'zip',
      title: 'title',
      notes: 'notes'
    };
    for (let [camel, snake] of Object.entries(fieldMap)) {
      if (data[camel] !== undefined) {
        body[snake] = data[camel];
      }
    }
    let response = await this.axios.put(`/contacts/${contactId}`, body, {
      params: this.params()
    });
    return response.data;
  }

  async deleteContact(contactId: number) {
    let response = await this.axios.delete(`/contacts/${contactId}`, {
      params: this.params()
    });
    return response.data;
  }

  // ── Tickets ──

  async listTickets(params?: {
    status?: string;
    customerId?: number;
    assignedTo?: number;
    createdBefore?: string;
    createdAfter?: string;
    sort?: string;
    query?: string;
    page?: number;
  }) {
    let response = await this.axios.get('/tickets', {
      params: this.params({
        status: params?.status,
        customer_id: params?.customerId,
        assigned_to: params?.assignedTo,
        created_before: params?.createdBefore,
        created_after: params?.createdAfter,
        sort: params?.sort,
        query: params?.query,
        page: params?.page
      })
    });
    return response.data;
  }

  async getTicket(ticketId: number) {
    let response = await this.axios.get(`/tickets/${ticketId}`, {
      params: this.params()
    });
    return response.data;
  }

  async createTicket(data: {
    customerId: number;
    subject: string;
    description?: string;
    status?: string;
    priority?: string;
    assignedTo?: number;
    ticketType?: string;
    dueDate?: string;
  }) {
    let response = await this.axios.post(
      '/tickets',
      {
        customer_id: data.customerId,
        subject: data.subject,
        description: data.description,
        status: data.status,
        priority: data.priority,
        assigned_to: data.assignedTo,
        ticket_type: data.ticketType,
        due_date: data.dueDate
      },
      {
        params: this.params()
      }
    );
    return response.data;
  }

  async updateTicket(ticketId: number, data: Record<string, any>) {
    let body: Record<string, any> = {};
    let fieldMap: Record<string, string> = {
      subject: 'subject',
      description: 'description',
      status: 'status',
      priority: 'priority',
      assignedTo: 'assigned_to',
      ticketType: 'ticket_type',
      dueDate: 'due_date',
      customerId: 'customer_id'
    };
    for (let [camel, snake] of Object.entries(fieldMap)) {
      if (data[camel] !== undefined) {
        body[snake] = data[camel];
      }
    }
    let response = await this.axios.put(`/tickets/${ticketId}`, body, {
      params: this.params()
    });
    return response.data;
  }

  async deleteTicket(ticketId: number) {
    let response = await this.axios.delete(`/tickets/${ticketId}`, {
      params: this.params()
    });
    return response.data;
  }

  // ── Ticket Comments ──

  async listTicketComments(ticketId: number, page?: number) {
    let response = await this.axios.get(`/tickets/${ticketId}/comments`, {
      params: this.params({ page })
    });
    return response.data;
  }

  async createTicketComment(
    ticketId: number,
    data: {
      body: string;
      doNotEmail?: boolean;
      hidden?: boolean;
      subject?: string;
    }
  ) {
    let response = await this.axios.post(
      `/tickets/${ticketId}/comment`,
      {
        body: data.body,
        do_not_email: data.doNotEmail,
        hidden: data.hidden,
        subject: data.subject
      },
      {
        params: this.params()
      }
    );
    return response.data;
  }

  // ── Invoices ──

  async listInvoices(params?: {
    customerId?: number;
    status?: string;
    createdBefore?: string;
    createdAfter?: string;
    sort?: string;
    page?: number;
  }) {
    let response = await this.axios.get('/invoices', {
      params: this.params({
        customer_id: params?.customerId,
        status: params?.status,
        created_before: params?.createdBefore,
        created_after: params?.createdAfter,
        sort: params?.sort,
        page: params?.page
      })
    });
    return response.data;
  }

  async getInvoice(invoiceId: number) {
    let response = await this.axios.get(`/invoices/${invoiceId}`, {
      params: this.params()
    });
    return response.data;
  }

  async createInvoice(data: {
    customerId: number;
    ticketId?: number;
    number?: string;
    date?: string;
    dueDate?: string;
    notes?: string;
    lineItems?: Array<{
      name?: string;
      description?: string;
      quantity?: number;
      price?: number;
      taxable?: boolean;
      productId?: number;
    }>;
  }) {
    let body: Record<string, any> = {
      customer_id: data.customerId,
      ticket_id: data.ticketId,
      number: data.number,
      date: data.date,
      due_date: data.dueDate,
      notes: data.notes
    };
    if (data.lineItems) {
      body.line_items = data.lineItems.map(item => ({
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        price: item.price,
        taxable: item.taxable,
        product_id: item.productId
      }));
    }
    let response = await this.axios.post('/invoices', body, {
      params: this.params()
    });
    return response.data;
  }

  async updateInvoice(invoiceId: number, data: Record<string, any>) {
    let body: Record<string, any> = {};
    let fieldMap: Record<string, string> = {
      notes: 'notes',
      dueDate: 'due_date',
      date: 'date',
      status: 'status'
    };
    for (let [camel, snake] of Object.entries(fieldMap)) {
      if (data[camel] !== undefined) {
        body[snake] = data[camel];
      }
    }
    let response = await this.axios.put(`/invoices/${invoiceId}`, body, {
      params: this.params()
    });
    return response.data;
  }

  async deleteInvoice(invoiceId: number) {
    let response = await this.axios.delete(`/invoices/${invoiceId}`, {
      params: this.params()
    });
    return response.data;
  }

  // ── Estimates ──

  async listEstimates(params?: {
    customerId?: number;
    status?: string;
    createdBefore?: string;
    createdAfter?: string;
    page?: number;
  }) {
    let response = await this.axios.get('/estimates', {
      params: this.params({
        customer_id: params?.customerId,
        status: params?.status,
        created_before: params?.createdBefore,
        created_after: params?.createdAfter,
        page: params?.page
      })
    });
    return response.data;
  }

  async getEstimate(estimateId: number) {
    let response = await this.axios.get(`/estimates/${estimateId}`, {
      params: this.params()
    });
    return response.data;
  }

  async createEstimate(data: {
    customerId: number;
    ticketId?: number;
    number?: string;
    date?: string;
    notes?: string;
    lineItems?: Array<{
      name?: string;
      description?: string;
      quantity?: number;
      price?: number;
      taxable?: boolean;
      productId?: number;
    }>;
  }) {
    let body: Record<string, any> = {
      customer_id: data.customerId,
      ticket_id: data.ticketId,
      number: data.number,
      date: data.date,
      notes: data.notes
    };
    if (data.lineItems) {
      body.line_items = data.lineItems.map(item => ({
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        price: item.price,
        taxable: item.taxable,
        product_id: item.productId
      }));
    }
    let response = await this.axios.post('/estimates', body, {
      params: this.params()
    });
    return response.data;
  }

  async updateEstimate(estimateId: number, data: Record<string, any>) {
    let body: Record<string, any> = {};
    let fieldMap: Record<string, string> = {
      notes: 'notes',
      status: 'status',
      date: 'date'
    };
    for (let [camel, snake] of Object.entries(fieldMap)) {
      if (data[camel] !== undefined) {
        body[snake] = data[camel];
      }
    }
    let response = await this.axios.put(`/estimates/${estimateId}`, body, {
      params: this.params()
    });
    return response.data;
  }

  async deleteEstimate(estimateId: number) {
    let response = await this.axios.delete(`/estimates/${estimateId}`, {
      params: this.params()
    });
    return response.data;
  }

  // ── Leads ──

  async listLeads(params?: {
    status?: string;
    assignedTo?: number;
    createdBefore?: string;
    createdAfter?: string;
    query?: string;
    page?: number;
  }) {
    let response = await this.axios.get('/leads', {
      params: this.params({
        status: params?.status,
        assigned_to: params?.assignedTo,
        created_before: params?.createdBefore,
        created_after: params?.createdAfter,
        query: params?.query,
        page: params?.page
      })
    });
    return response.data;
  }

  async getLead(leadId: number) {
    let response = await this.axios.get(`/leads/${leadId}`, {
      params: this.params()
    });
    return response.data;
  }

  async createLead(data: {
    firstname: string;
    lastname: string;
    email?: string;
    phone?: string;
    businessName?: string;
    notes?: string;
    assignedTo?: number;
    status?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
  }) {
    let response = await this.axios.post(
      '/leads',
      {
        firstname: data.firstname,
        lastname: data.lastname,
        email: data.email,
        phone: data.phone,
        business_name: data.businessName,
        notes: data.notes,
        assigned_to: data.assignedTo,
        status: data.status,
        address: data.address,
        city: data.city,
        state: data.state,
        zip: data.zip
      },
      {
        params: this.params()
      }
    );
    return response.data;
  }

  async updateLead(leadId: number, data: Record<string, any>) {
    let body: Record<string, any> = {};
    let fieldMap: Record<string, string> = {
      firstname: 'firstname',
      lastname: 'lastname',
      email: 'email',
      phone: 'phone',
      businessName: 'business_name',
      notes: 'notes',
      assignedTo: 'assigned_to',
      status: 'status',
      address: 'address',
      city: 'city',
      state: 'state',
      zip: 'zip'
    };
    for (let [camel, snake] of Object.entries(fieldMap)) {
      if (data[camel] !== undefined) {
        body[snake] = data[camel];
      }
    }
    let response = await this.axios.put(`/leads/${leadId}`, body, {
      params: this.params()
    });
    return response.data;
  }

  async deleteLead(leadId: number) {
    let response = await this.axios.delete(`/leads/${leadId}`, {
      params: this.params()
    });
    return response.data;
  }

  // ── Products ──

  async listProducts(params?: { categoryId?: number; query?: string; page?: number }) {
    let response = await this.axios.get('/products', {
      params: this.params({
        category_id: params?.categoryId,
        query: params?.query,
        page: params?.page
      })
    });
    return response.data;
  }

  async getProduct(productId: number) {
    let response = await this.axios.get(`/products/${productId}`, {
      params: this.params()
    });
    return response.data;
  }

  async createProduct(data: {
    name: string;
    description?: string;
    cost?: number;
    price?: number;
    categoryId?: number;
    sku?: string;
    quantity?: number;
    upc?: string;
    optionalLocation?: string;
  }) {
    let response = await this.axios.post(
      '/products',
      {
        name: data.name,
        description: data.description,
        cost: data.cost,
        price_retail: data.price,
        category_id: data.categoryId,
        sku: data.sku,
        quantity: data.quantity,
        upc_code: data.upc,
        location: data.optionalLocation
      },
      {
        params: this.params()
      }
    );
    return response.data;
  }

  async updateProduct(productId: number, data: Record<string, any>) {
    let body: Record<string, any> = {};
    let fieldMap: Record<string, string> = {
      name: 'name',
      description: 'description',
      cost: 'cost',
      price: 'price_retail',
      categoryId: 'category_id',
      sku: 'sku',
      quantity: 'quantity',
      upc: 'upc_code',
      location: 'location'
    };
    for (let [camel, snake] of Object.entries(fieldMap)) {
      if (data[camel] !== undefined) {
        body[snake] = data[camel];
      }
    }
    let response = await this.axios.put(`/products/${productId}`, body, {
      params: this.params()
    });
    return response.data;
  }

  async deleteProduct(productId: number) {
    let response = await this.axios.delete(`/products/${productId}`, {
      params: this.params()
    });
    return response.data;
  }

  // ── Assets ──

  async listAssets(params?: {
    customerId?: number;
    assetTypeId?: number;
    query?: string;
    snmpEnabled?: boolean;
    page?: number;
  }) {
    let response = await this.axios.get('/customer_assets', {
      params: this.params({
        customer_id: params?.customerId,
        asset_type_id: params?.assetTypeId,
        query: params?.query,
        snmp_enabled: params?.snmpEnabled,
        page: params?.page
      })
    });
    return response.data;
  }

  async getAsset(assetId: number) {
    let response = await this.axios.get(`/customer_assets/${assetId}`, {
      params: this.params()
    });
    return response.data;
  }

  async createAsset(data: {
    name: string;
    customerId?: number;
    assetTypeName?: string;
    assetTypeId?: number;
    assetSerial?: string;
    properties?: Record<string, any>;
  }) {
    let response = await this.axios.post(
      '/customer_assets',
      {
        name: data.name,
        customer_id: data.customerId,
        asset_type_name: data.assetTypeName,
        asset_type_id: data.assetTypeId,
        asset_serial: data.assetSerial,
        properties: data.properties
      },
      {
        params: this.params()
      }
    );
    return response.data;
  }

  async updateAsset(assetId: number, data: Record<string, any>) {
    let body: Record<string, any> = {};
    let fieldMap: Record<string, string> = {
      name: 'name',
      customerId: 'customer_id',
      assetTypeName: 'asset_type_name',
      assetTypeId: 'asset_type_id',
      assetSerial: 'asset_serial',
      properties: 'properties'
    };
    for (let [camel, snake] of Object.entries(fieldMap)) {
      if (data[camel] !== undefined) {
        body[snake] = data[camel];
      }
    }
    let response = await this.axios.put(`/customer_assets/${assetId}`, body, {
      params: this.params()
    });
    return response.data;
  }

  // ── Appointments ──

  async listAppointments(params?: {
    dateFrom?: string;
    dateTo?: string;
    mine?: boolean;
    page?: number;
  }) {
    let response = await this.axios.get('/appointments', {
      params: this.params({
        date_from: params?.dateFrom,
        date_to: params?.dateTo,
        mine: params?.mine,
        page: params?.page
      })
    });
    return response.data;
  }

  async getAppointment(appointmentId: number) {
    let response = await this.axios.get(`/appointments/${appointmentId}`, {
      params: this.params()
    });
    return response.data;
  }

  async createAppointment(data: {
    summary: string;
    startAt: string;
    endAt?: string;
    description?: string;
    customerId?: number;
    ticketId?: number;
    userId?: number;
    location?: string;
    emailCustomer?: boolean;
    appointmentDuration?: number;
    appointmentTypeId?: number;
    allDay?: boolean;
    doNotEmail?: boolean;
  }) {
    let response = await this.axios.post(
      '/appointments',
      {
        summary: data.summary,
        start_at: data.startAt,
        end_at: data.endAt,
        description: data.description,
        customer_id: data.customerId,
        ticket_id: data.ticketId,
        user_id: data.userId,
        location: data.location,
        email_customer: data.emailCustomer,
        appointment_duration: data.appointmentDuration,
        appointment_type_id: data.appointmentTypeId,
        all_day: data.allDay,
        do_not_email: data.doNotEmail
      },
      {
        params: this.params()
      }
    );
    return response.data;
  }

  async updateAppointment(appointmentId: number, data: Record<string, any>) {
    let body: Record<string, any> = {};
    let fieldMap: Record<string, string> = {
      summary: 'summary',
      startAt: 'start_at',
      endAt: 'end_at',
      description: 'description',
      customerId: 'customer_id',
      ticketId: 'ticket_id',
      userId: 'user_id',
      location: 'location',
      emailCustomer: 'email_customer',
      appointmentDuration: 'appointment_duration',
      appointmentTypeId: 'appointment_type_id',
      allDay: 'all_day'
    };
    for (let [camel, snake] of Object.entries(fieldMap)) {
      if (data[camel] !== undefined) {
        body[snake] = data[camel];
      }
    }
    let response = await this.axios.put(`/appointments/${appointmentId}`, body, {
      params: this.params()
    });
    return response.data;
  }

  async deleteAppointment(appointmentId: number) {
    let response = await this.axios.delete(`/appointments/${appointmentId}`, {
      params: this.params()
    });
    return response.data;
  }

  // ── Payments ──

  async listPayments(params?: {
    customerId?: number;
    invoiceId?: number;
    createdBefore?: string;
    createdAfter?: string;
    page?: number;
  }) {
    let response = await this.axios.get('/payments', {
      params: this.params({
        customer_id: params?.customerId,
        invoice_id: params?.invoiceId,
        created_before: params?.createdBefore,
        created_after: params?.createdAfter,
        page: params?.page
      })
    });
    return response.data;
  }

  async getPayment(paymentId: number) {
    let response = await this.axios.get(`/payments/${paymentId}`, {
      params: this.params()
    });
    return response.data;
  }

  async createPayment(data: {
    invoiceId: number;
    amount: number;
    paymentMethod?: string;
    paymentDate?: string;
    notes?: string;
  }) {
    let response = await this.axios.post(
      '/payments',
      {
        invoice_id: data.invoiceId,
        amount: data.amount,
        payment_method: data.paymentMethod,
        applied_at: data.paymentDate,
        notes: data.notes
      },
      {
        params: this.params()
      }
    );
    return response.data;
  }

  // ── Employee Clock Entries ──

  async listClockEntries(params?: {
    userId?: number;
    createdBefore?: string;
    createdAfter?: string;
    page?: number;
  }) {
    let response = await this.axios.get('/employee_clock_entries', {
      params: this.params({
        user_id: params?.userId,
        created_before: params?.createdBefore,
        created_after: params?.createdAfter,
        page: params?.page
      })
    });
    return response.data;
  }

  async createClockEntry(data: {
    userId: number;
    startTime: string;
    endTime?: string;
    notes?: string;
  }) {
    let response = await this.axios.post(
      '/employee_clock_entries',
      {
        user_id: data.userId,
        start_time: data.startTime,
        end_time: data.endTime,
        notes: data.notes
      },
      {
        params: this.params()
      }
    );
    return response.data;
  }

  async updateClockEntry(entryId: number, data: Record<string, any>) {
    let body: Record<string, any> = {};
    let fieldMap: Record<string, string> = {
      startTime: 'start_time',
      endTime: 'end_time',
      notes: 'notes'
    };
    for (let [camel, snake] of Object.entries(fieldMap)) {
      if (data[camel] !== undefined) {
        body[snake] = data[camel];
      }
    }
    let response = await this.axios.put(`/employee_clock_entries/${entryId}`, body, {
      params: this.params()
    });
    return response.data;
  }

  async deleteClockEntry(entryId: number) {
    let response = await this.axios.delete(`/employee_clock_entries/${entryId}`, {
      params: this.params()
    });
    return response.data;
  }

  // ── Call Logs ──

  async listCallLogs(params?: {
    customerId?: number;
    userId?: number;
    createdBefore?: string;
    createdAfter?: string;
    page?: number;
  }) {
    let response = await this.axios.get('/call_logs', {
      params: this.params({
        customer_id: params?.customerId,
        user_id: params?.userId,
        created_before: params?.createdBefore,
        created_after: params?.createdAfter,
        page: params?.page
      })
    });
    return response.data;
  }

  async createCallLog(data: {
    customerId: number;
    duration: number;
    notes?: string;
    callType?: string;
    direction?: string;
  }) {
    let response = await this.axios.post(
      '/call_logs',
      {
        customer_id: data.customerId,
        duration: data.duration,
        notes: data.notes,
        call_type: data.callType,
        direction: data.direction
      },
      {
        params: this.params()
      }
    );
    return response.data;
  }

  // ── Line Items ──

  async listLineItems(params?: {
    invoiceId?: number;
    estimateId?: number;
    ticketId?: number;
    page?: number;
  }) {
    let response = await this.axios.get('/line_items', {
      params: this.params({
        invoice_id: params?.invoiceId,
        estimate_id: params?.estimateId,
        ticket_id: params?.ticketId,
        page: params?.page
      })
    });
    return response.data;
  }

  async createLineItem(data: {
    parentType: string;
    parentId: number;
    name?: string;
    description?: string;
    quantity: number;
    price: number;
    taxable?: boolean;
    productId?: number;
  }) {
    let response = await this.axios.post(
      '/line_items',
      {
        parent_type: data.parentType,
        parent_id: data.parentId,
        name: data.name,
        description: data.description,
        quantity: data.quantity,
        price: data.price,
        taxable: data.taxable,
        product_id: data.productId
      },
      {
        params: this.params()
      }
    );
    return response.data;
  }

  async updateLineItem(lineItemId: number, data: Record<string, any>) {
    let body: Record<string, any> = {};
    let fieldMap: Record<string, string> = {
      name: 'name',
      description: 'description',
      quantity: 'quantity',
      price: 'price',
      taxable: 'taxable'
    };
    for (let [camel, snake] of Object.entries(fieldMap)) {
      if (data[camel] !== undefined) {
        body[snake] = data[camel];
      }
    }
    let response = await this.axios.put(`/line_items/${lineItemId}`, body, {
      params: this.params()
    });
    return response.data;
  }

  async deleteLineItem(lineItemId: number) {
    let response = await this.axios.delete(`/line_items/${lineItemId}`, {
      params: this.params()
    });
    return response.data;
  }

  // ── Users ──

  async getCurrentUser() {
    let response = await this.axios.get('/me', {
      params: this.params()
    });
    return response.data;
  }

  async listUsers(params?: { page?: number }) {
    let response = await this.axios.get('/users', {
      params: this.params({ page: params?.page })
    });
    return response.data;
  }
}

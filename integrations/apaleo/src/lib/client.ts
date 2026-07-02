import { createAxios } from 'slates';

let BASE_URL = 'https://api.apaleo.com';
let WEBHOOK_BASE_URL = 'https://webhook.apaleo.com';

export class ApaleoClient {
  private api: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.api = createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Reservations ───

  async listReservations(
    params: {
      propertyId?: string;
      status?: string;
      dateFilter?: string;
      from?: string;
      to?: string;
      unitGroupIds?: string[];
      unitIds?: string[];
      bookingId?: string;
      textSearch?: string;
      pageNumber?: number;
      pageSize?: number;
      sort?: string;
      expand?: string[];
    } = {}
  ) {
    let query: Record<string, any> = {};
    if (params.propertyId) query.propertyIds = params.propertyId;
    if (params.status) query.status = params.status;
    if (params.dateFilter) query.dateFilter = params.dateFilter;
    if (params.from) query.from = params.from;
    if (params.to) query.to = params.to;
    if (params.unitGroupIds) query.unitGroupIds = params.unitGroupIds.join(',');
    if (params.unitIds) query.unitIds = params.unitIds.join(',');
    if (params.bookingId) query.bookingId = params.bookingId;
    if (params.textSearch) query.textSearch = params.textSearch;
    if (params.pageNumber) query.pageNumber = params.pageNumber;
    if (params.pageSize) query.pageSize = params.pageSize;
    if (params.sort) query.sort = params.sort;
    if (params.expand?.length) query.expand = params.expand.join(',');

    let response = await this.api.get('/booking/v1/reservations', { params: query });
    return response.data;
  }

  async getReservation(reservationId: string, expand?: string[]) {
    let params: Record<string, any> = {};
    if (expand?.length) params.expand = expand.join(',');
    let response = await this.api.get(`/booking/v1/reservations/${reservationId}`, { params });
    return response.data;
  }

  async createBooking(body: {
    paymentAccount?: {
      accountNumber?: string;
      accountHolder?: string;
      expiryMonth?: string;
      expiryYear?: string;
      payerEmail?: string;
      isVirtual?: boolean;
    };
    booker?: {
      title?: string;
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
      address?: {
        addressLine1?: string;
        postalCode?: string;
        city?: string;
        countryCode: string;
      };
    };
    comment?: string;
    bookerComment?: string;
    reservations: Array<{
      arrival: string;
      departure: string;
      adults: number;
      childrenAges?: number[];
      guestComment?: string;
      channelCode?: string;
      externalCode?: string;
      primaryGuest?: {
        title?: string;
        firstName: string;
        lastName: string;
        email?: string;
        phone?: string;
      };
      guaranteeType?: string;
      travelPurpose?: string;
      timeSlices?: Array<{
        ratePlanId: string;
        totalAmount?: { amount: number; currency: string };
      }>;
      services?: Array<{
        serviceId: string;
        count?: number;
        amount?: { amount: number; currency: string };
        dates?: Array<{
          serviceDate: string;
          count?: number;
          amount?: { amount: number; currency: string };
        }>;
      }>;
      prePaymentAmount?: { amount: number; currency: string };
      commission?: {
        commissionAmount?: { amount: number; currency: string };
        beforeCommissionAmount?: { amount: number; currency: string };
      };
      promoCode?: string;
      corporateCode?: string;
      companyId?: string;
      unitId?: string;
      unitGroupId?: string;
    }>;
    transactionReference?: string;
  }) {
    let response = await this.api.post('/booking/v1/bookings', body);
    return response.data;
  }

  async amendReservation(
    reservationId: string,
    body: {
      arrival?: string;
      departure?: string;
      adults?: number;
      childrenAges?: number[];
      comment?: string;
      guestComment?: string;
      travelPurpose?: string;
      companyId?: string;
      corporateCode?: string;
      requote?: boolean;
      timeSlices?: Array<{
        ratePlanId: string;
        totalAmount?: { amount: number; currency: string };
      }>;
    }
  ) {
    let response = await this.api.patch(`/booking/v1/reservations/${reservationId}`, body);
    return response.data;
  }

  async cancelReservation(reservationId: string) {
    let response = await this.api.put(
      `/booking/v1/reservation-actions/${reservationId}/cancel`
    );
    return response.data;
  }

  async checkInReservation(reservationId: string) {
    let response = await this.api.put(
      `/booking/v1/reservation-actions/${reservationId}/checkin`
    );
    return response.data;
  }

  async checkOutReservation(reservationId: string) {
    let response = await this.api.put(
      `/booking/v1/reservation-actions/${reservationId}/checkout`
    );
    return response.data;
  }

  async noShowReservation(reservationId: string) {
    let response = await this.api.put(
      `/booking/v1/reservation-actions/${reservationId}/noshow`
    );
    return response.data;
  }

  async assignUnit(reservationId: string, unitId: string) {
    let response = await this.api.put(
      `/booking/v1/reservation-actions/${reservationId}/assign-unit/${unitId}`
    );
    return response.data;
  }

  async unassignUnit(reservationId: string) {
    let response = await this.api.put(
      `/booking/v1/reservation-actions/${reservationId}/unassign-unit`
    );
    return response.data;
  }

  // ─── Bookings ───

  async getBooking(bookingId: string, expand?: string[]) {
    let params: Record<string, any> = {};
    if (expand?.length) params.expand = expand.join(',');
    let response = await this.api.get(`/booking/v1/bookings/${bookingId}`, { params });
    return response.data;
  }

  async listBookings(
    params: {
      propertyId?: string;
      groupId?: string;
      textSearch?: string;
      pageNumber?: number;
      pageSize?: number;
      expand?: string[];
    } = {}
  ) {
    let query: Record<string, any> = {};
    if (params.propertyId) query.propertyIds = params.propertyId;
    if (params.groupId) query.groupId = params.groupId;
    if (params.textSearch) query.textSearch = params.textSearch;
    if (params.pageNumber) query.pageNumber = params.pageNumber;
    if (params.pageSize) query.pageSize = params.pageSize;
    if (params.expand?.length) query.expand = params.expand.join(',');

    let response = await this.api.get('/booking/v1/bookings', { params: query });
    return response.data;
  }

  // ─── Properties ───

  async listProperties() {
    let response = await this.api.get('/inventory/v1/properties');
    return response.data;
  }

  async getProperty(propertyId: string) {
    let response = await this.api.get(`/inventory/v1/properties/${propertyId}`);
    return response.data;
  }

  // ─── Units (Rooms) ───

  async listUnits(
    params: {
      propertyId?: string;
      unitGroupId?: string;
      isOccupied?: boolean;
      maintenanceType?: string;
      condition?: string;
      pageNumber?: number;
      pageSize?: number;
      expand?: string[];
    } = {}
  ) {
    let query: Record<string, any> = {};
    if (params.propertyId) query.propertyId = params.propertyId;
    if (params.unitGroupId) query.unitGroupId = params.unitGroupId;
    if (params.isOccupied !== undefined) query.isOccupied = params.isOccupied;
    if (params.maintenanceType) query.maintenanceType = params.maintenanceType;
    if (params.condition) query.condition = params.condition;
    if (params.pageNumber) query.pageNumber = params.pageNumber;
    if (params.pageSize) query.pageSize = params.pageSize;
    if (params.expand?.length) query.expand = params.expand.join(',');

    let response = await this.api.get('/inventory/v1/units', { params: query });
    return response.data;
  }

  async getUnit(unitId: string, expand?: string[]) {
    let params: Record<string, any> = {};
    if (expand?.length) params.expand = expand.join(',');
    let response = await this.api.get(`/inventory/v1/units/${unitId}`, { params });
    return response.data;
  }

  async changeUnitState(unitId: string, condition: string) {
    let response = await this.api.put(`/inventory/v1/units/${unitId}/$set-condition`, {
      condition
    });
    return response.data;
  }

  // ─── Unit Groups (Room Types) ───

  async listUnitGroups(
    params: { propertyId?: string; pageNumber?: number; pageSize?: number } = {}
  ) {
    let query: Record<string, any> = {};
    if (params.propertyId) query.propertyId = params.propertyId;
    if (params.pageNumber) query.pageNumber = params.pageNumber;
    if (params.pageSize) query.pageSize = params.pageSize;

    let response = await this.api.get('/inventory/v1/unit-groups', { params: query });
    return response.data;
  }

  async getUnitGroup(unitGroupId: string) {
    let response = await this.api.get(`/inventory/v1/unit-groups/${unitGroupId}`);
    return response.data;
  }

  // ─── Rate Plans ───

  async listRatePlans(
    params: {
      propertyId?: string;
      unitGroupId?: string;
      channelCode?: string;
      isSubjectToCityTax?: boolean;
      pageNumber?: number;
      pageSize?: number;
    } = {}
  ) {
    let query: Record<string, any> = {};
    if (params.propertyId) query.propertyId = params.propertyId;
    if (params.unitGroupId) query.unitGroupId = params.unitGroupId;
    if (params.channelCode) query.channelCode = params.channelCode;
    if (params.isSubjectToCityTax !== undefined)
      query.isSubjectToCityTax = params.isSubjectToCityTax;
    if (params.pageNumber) query.pageNumber = params.pageNumber;
    if (params.pageSize) query.pageSize = params.pageSize;

    let response = await this.api.get('/rateplan/v1/rate-plans', { params: query });
    return response.data;
  }

  async getRatePlan(ratePlanId: string) {
    let response = await this.api.get(`/rateplan/v1/rate-plans/${ratePlanId}`);
    return response.data;
  }

  // ─── Folios ───

  async listFolios(
    params: {
      propertyId?: string;
      reservationIds?: string[];
      bookingId?: string;
      isEmpty?: boolean;
      hasInvoices?: boolean;
      onlyMain?: boolean;
      type?: string;
      pageNumber?: number;
      pageSize?: number;
      expand?: string[];
    } = {}
  ) {
    let query: Record<string, any> = {};
    if (params.propertyId) query.propertyId = params.propertyId;
    if (params.reservationIds?.length) query.reservationIds = params.reservationIds.join(',');
    if (params.bookingId) query.bookingId = params.bookingId;
    if (params.isEmpty !== undefined) query.isEmpty = params.isEmpty;
    if (params.hasInvoices !== undefined) query.hasInvoices = params.hasInvoices;
    if (params.onlyMain !== undefined) query.onlyMain = params.onlyMain;
    if (params.type) query.type = params.type;
    if (params.pageNumber) query.pageNumber = params.pageNumber;
    if (params.pageSize) query.pageSize = params.pageSize;
    if (params.expand?.length) query.expand = params.expand.join(',');

    let response = await this.api.get('/finance/v1/folios', { params: query });
    return response.data;
  }

  async getFolio(folioId: string, expand?: string[]) {
    let params: Record<string, any> = {};
    if (expand?.length) params.expand = expand.join(',');
    let response = await this.api.get(`/finance/v1/folios/${folioId}`, { params });
    return response.data;
  }

  async postCharge(
    folioId: string,
    body: {
      serviceType: string;
      name: string;
      amount: { amount: number; currency: string };
      receipt?: string;
      vatType?: string;
      subAccountId?: string;
      quantity?: number;
    }
  ) {
    let response = await this.api.post(`/finance/v1/folios/${folioId}/charges`, body);
    return response.data;
  }

  async postPayment(
    folioId: string,
    body: {
      method: string;
      amount: { amount: number; currency: string };
      receipt?: string;
    }
  ) {
    let response = await this.api.post(`/finance/v1/folios/${folioId}/payments`, body);
    return response.data;
  }

  async postRefund(
    folioId: string,
    body: {
      method: string;
      amount: { amount: number; currency: string };
      receipt?: string;
      reason?: string;
    }
  ) {
    let response = await this.api.post(`/finance/v1/folios/${folioId}/refunds`, body);
    return response.data;
  }

  async closeFolio(folioId: string) {
    let response = await this.api.put(`/finance/v1/folio-actions/${folioId}/close`);
    return response.data;
  }

  // ─── Invoices ───

  async listInvoices(
    params: {
      propertyId?: string;
      reservationIds?: string[];
      folioIds?: string[];
      number?: string;
      status?: string[];
      dateFrom?: string;
      dateTo?: string;
      pageNumber?: number;
      pageSize?: number;
    } = {}
  ) {
    let query: Record<string, any> = {};
    if (params.propertyId) query.propertyId = params.propertyId;
    if (params.reservationIds?.length) query.reservationIds = params.reservationIds.join(',');
    if (params.folioIds?.length) query.folioIds = params.folioIds.join(',');
    if (params.number) query.number = params.number;
    if (params.status?.length) query.status = params.status.join(',');
    if (params.dateFrom) query.from = params.dateFrom;
    if (params.dateTo) query.to = params.dateTo;
    if (params.pageNumber) query.pageNumber = params.pageNumber;
    if (params.pageSize) query.pageSize = params.pageSize;

    let response = await this.api.get('/finance/v1/invoices', { params: query });
    return response.data;
  }

  async getInvoice(invoiceId: string) {
    let response = await this.api.get(`/finance/v1/invoices/${invoiceId}`);
    return response.data;
  }

  async createInvoice(folioId: string) {
    let response = await this.api.post(`/finance/v1/folio-actions/${folioId}/create-invoice`);
    return response.data;
  }

  async cancelInvoice(invoiceId: string) {
    let response = await this.api.put(`/finance/v1/invoice-actions/${invoiceId}/cancel`);
    return response.data;
  }

  async markInvoicePaid(invoiceId: string) {
    let response = await this.api.put(`/finance/v1/invoice-actions/${invoiceId}/mark-as-paid`);
    return response.data;
  }

  // ─── Companies ───

  async listCompanies(
    params: {
      propertyId?: string;
      textSearch?: string;
      pageNumber?: number;
      pageSize?: number;
    } = {}
  ) {
    let query: Record<string, any> = {};
    if (params.propertyId) query.propertyId = params.propertyId;
    if (params.textSearch) query.textSearch = params.textSearch;
    if (params.pageNumber) query.pageNumber = params.pageNumber;
    if (params.pageSize) query.pageSize = params.pageSize;

    let response = await this.api.get('/booking/v1/companies', { params: query });
    return response.data;
  }

  async getCompany(companyId: string) {
    let response = await this.api.get(`/booking/v1/companies/${companyId}`);
    return response.data;
  }

  async createCompany(body: {
    code?: string;
    name: string;
    propertyId: string;
    taxId?: string;
    address?: {
      addressLine1?: string;
      addressLine2?: string;
      postalCode?: string;
      city?: string;
      regionCode?: string;
      countryCode: string;
    };
  }) {
    let response = await this.api.post('/booking/v1/companies', body);
    return response.data;
  }

  async updateCompany(
    companyId: string,
    body: {
      name?: string;
      taxId?: string;
      address?: {
        addressLine1?: string;
        addressLine2?: string;
        postalCode?: string;
        city?: string;
        regionCode?: string;
        countryCode?: string;
      };
    }
  ) {
    let response = await this.api.patch(`/booking/v1/companies/${companyId}`, body);
    return response.data;
  }

  async deleteCompany(companyId: string) {
    let response = await this.api.delete(`/booking/v1/companies/${companyId}`);
    return response.data;
  }

  // ─── Groups ───

  async listGroups(
    params: {
      propertyId?: string;
      textSearch?: string;
      pageNumber?: number;
      pageSize?: number;
    } = {}
  ) {
    let query: Record<string, any> = {};
    if (params.propertyId) query.propertyId = params.propertyId;
    if (params.textSearch) query.textSearch = params.textSearch;
    if (params.pageNumber) query.pageNumber = params.pageNumber;
    if (params.pageSize) query.pageSize = params.pageSize;

    let response = await this.api.get('/booking/v1/groups', { params: query });
    return response.data;
  }

  async getGroup(groupId: string) {
    let response = await this.api.get(`/booking/v1/groups/${groupId}`);
    return response.data;
  }

  // ─── Blocks ───

  async listBlocks(
    params: {
      propertyId?: string;
      groupId?: string;
      status?: string;
      from?: string;
      to?: string;
      pageNumber?: number;
      pageSize?: number;
    } = {}
  ) {
    let query: Record<string, any> = {};
    if (params.propertyId) query.propertyId = params.propertyId;
    if (params.groupId) query.groupId = params.groupId;
    if (params.status) query.status = params.status;
    if (params.from) query.from = params.from;
    if (params.to) query.to = params.to;
    if (params.pageNumber) query.pageNumber = params.pageNumber;
    if (params.pageSize) query.pageSize = params.pageSize;

    let response = await this.api.get('/booking/v1/blocks', { params: query });
    return response.data;
  }

  async getBlock(blockId: string) {
    let response = await this.api.get(`/booking/v1/blocks/${blockId}`);
    return response.data;
  }

  // ─── Night Audit ───

  async triggerNightAudit(propertyId: string) {
    let response = await this.api.put(
      `/settings/v1/night-audit-actions/${propertyId}/trigger`
    );
    return response.data;
  }

  async getNightAuditStatus(propertyId: string) {
    let response = await this.api.get(`/settings/v1/night-audit-actions/${propertyId}/status`);
    return response.data;
  }

  // ─── Offers (Availability Search) ───

  async getOffers(params: {
    propertyId: string;
    arrival: string;
    departure: string;
    adults: number;
    childrenAges?: number[];
    channelCode?: string;
    promoCode?: string;
    corporateCode?: string;
    unitGroupIds?: string[];
    timeSliceTemplate?: string;
    unitGroupTypes?: string[];
  }) {
    let query: Record<string, any> = {
      propertyId: params.propertyId,
      arrival: params.arrival,
      departure: params.departure,
      adults: params.adults
    };
    if (params.childrenAges?.length) query.childrenAges = params.childrenAges.join(',');
    if (params.channelCode) query.channelCode = params.channelCode;
    if (params.promoCode) query.promoCode = params.promoCode;
    if (params.corporateCode) query.corporateCode = params.corporateCode;
    if (params.unitGroupIds?.length) query.unitGroupIds = params.unitGroupIds.join(',');
    if (params.timeSliceTemplate) query.timeSliceTemplate = params.timeSliceTemplate;
    if (params.unitGroupTypes?.length) query.unitGroupTypes = params.unitGroupTypes.join(',');

    let response = await this.api.get('/booking/v1/offers', { params: query });
    return response.data;
  }

  // ─── Maintenances ───

  async listMaintenances(
    params: {
      propertyId?: string;
      unitId?: string;
      unitGroupId?: string;
      from?: string;
      to?: string;
      type?: string;
      pageNumber?: number;
      pageSize?: number;
    } = {}
  ) {
    let query: Record<string, any> = {};
    if (params.propertyId) query.propertyId = params.propertyId;
    if (params.unitId) query.unitId = params.unitId;
    if (params.unitGroupId) query.unitGroupId = params.unitGroupId;
    if (params.from) query.from = params.from;
    if (params.to) query.to = params.to;
    if (params.type) query.type = params.type;
    if (params.pageNumber) query.pageNumber = params.pageNumber;
    if (params.pageSize) query.pageSize = params.pageSize;

    let response = await this.api.get('/inventory/v1/maintenances', { params: query });
    return response.data;
  }

  // ─── Accounting ───

  async getAccountingTransactions(params: {
    propertyId: string;
    from?: string;
    to?: string;
    type?: string;
    accountNumber?: string;
    pageNumber?: number;
    pageSize?: number;
  }) {
    let query: Record<string, any> = {
      propertyId: params.propertyId
    };
    if (params.from) query.from = params.from;
    if (params.to) query.to = params.to;
    if (params.type) query.type = params.type;
    if (params.accountNumber) query.accountNumber = params.accountNumber;
    if (params.pageNumber) query.pageNumber = params.pageNumber;
    if (params.pageSize) query.pageSize = params.pageSize;

    let response = await this.api.get('/finance/v1/accounts/export', { params: query });
    return response.data;
  }
}

// ─── Webhook Client ───

export class ApaleoWebhookClient {
  private api: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.api = createAxios({
      baseURL: WEBHOOK_BASE_URL,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async createSubscription(body: {
    endpointUrl: string;
    topics?: string[];
    propertyIds?: string[];
  }) {
    let response = await this.api.post('/v1/subscriptions', body);
    return response.data;
  }

  async deleteSubscription(subscriptionId: string) {
    let response = await this.api.delete(`/v1/subscriptions/${subscriptionId}`);
    return response.data;
  }

  async listSubscriptions() {
    let response = await this.api.get('/v1/subscriptions');
    return response.data;
  }

  async getSubscription(subscriptionId: string) {
    let response = await this.api.get(`/v1/subscriptions/${subscriptionId}`);
    return response.data;
  }
}

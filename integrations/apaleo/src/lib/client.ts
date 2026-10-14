import {
  createApiServiceError,
  createAuthenticatedAxios,
  createAxios,
  pickDefined
} from 'slates';
import { apaleoApiError } from './errors';

let BASE_URL = 'https://api.apaleo.com';
let WEBHOOK_BASE_URL = 'https://webhook.apaleo.com';

type ReservationTimeSlice = {
  from: string;
  to: string;
  ratePlan: { id: string };
};

type ReservationStayOffer = { timeSlices: ReservationTimeSlice[] };

export class ApaleoClient {
  private api: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.api = createAuthenticatedAxios({
      baseURL: BASE_URL,
      authHeader: { value: `Bearer ${token}` },
      timeout: 30000,
      errorAdapter: apaleoApiError
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
    if (params.dateFilter || params.from || params.to)
      query.dateFilter = params.dateFilter ?? 'Arrival';
    if (params.from) query.from = params.from;
    if (params.to) query.to = params.to;
    if (params.unitGroupIds) query.unitGroupIds = params.unitGroupIds.join(',');
    if (params.unitIds) query.unitIds = params.unitIds.join(',');
    if (params.bookingId) query.bookingId = params.bookingId;
    if (params.textSearch) query.textSearch = params.textSearch;
    if (params.pageNumber !== undefined) query.pageNumber = params.pageNumber;
    if (params.pageSize !== undefined) query.pageSize = params.pageSize;
    if (params.sort) query.sort = params.sort;
    if (params.expand?.length) query.expand = params.expand.join(',');

    let response = await this.api.get('/booking/v1/reservations', { params: query });
    return response.data || {};
  }

  async getReservation(reservationId: string, expand?: string[]) {
    let params: Record<string, any> = {};
    if (expand?.length) params.expand = expand.join(',');
    let response = await this.api.get(
      `/booking/v1/reservations/${encodeURIComponent(reservationId)}`,
      { params }
    );
    return response.data || {};
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
    return response.data || {};
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
      timeSlices?: {
        ratePlanId: string;
        totalAmount?: { amount: number; currency: string };
      }[];
    }
  ) {
    if (body.corporateCode !== undefined) {
      throw createApiServiceError(
        'Apaleo does not support changing the corporate code of an existing reservation. Set corporateCode when creating the booking.'
      );
    }
    let stay = pickDefined({
      arrival: body.arrival,
      departure: body.departure,
      adults: body.adults,
      childrenAges: body.childrenAges,
      requote: body.requote,
      timeSlices: body.timeSlices
    });
    let metadata = pickDefined({
      comment: body.comment,
      guestComment: body.guestComment,
      travelPurpose: body.travelPurpose,
      'company/Id': body.companyId
    });
    if (!Object.keys(stay).length && !Object.keys(metadata).length) {
      throw createApiServiceError('Provide at least one reservation field to amend.');
    }
    if (Object.keys(stay).length) {
      let current = await this.getReservation(reservationId, ['timeSlices']);
      let timeSlices:
        | { ratePlanId: string; totalGrossAmount?: { amount: number; currency: string } }[]
        | undefined = body.timeSlices?.map(slice => ({
        ratePlanId: slice.ratePlanId,
        totalGrossAmount: slice.totalAmount
      }));
      if (!timeSlices) {
        if (body.arrival !== undefined || body.departure !== undefined) {
          let offers = await this.api.get(
            `/booking/v1/reservations/${encodeURIComponent(reservationId)}/offers`,
            {
              params: pickDefined({
                arrival: body.arrival,
                departure: body.departure,
                adults: body.adults,
                childrenAges: body.childrenAges?.join(','),
                requote: body.requote
              })
            }
          );
          let currentSlices: ReservationTimeSlice[] = current.timeSlices ?? [];
          let currentRatePlanIds = new Set(
            currentSlices.length
              ? currentSlices.map(slice => slice.ratePlan.id)
              : [current.ratePlan?.id]
          );
          let offer = (offers.data?.offers as ReservationStayOffer[] | undefined)?.find(
            item =>
              item.timeSlices?.length &&
              item.timeSlices.every(slice => {
                let overlappingRatePlans = new Set(
                  currentSlices
                    .filter(
                      existing =>
                        Date.parse(existing.from) < Date.parse(slice.to) &&
                        Date.parse(existing.to) > Date.parse(slice.from)
                    )
                    .map(existing => existing.ratePlan.id)
                );
                let expectedRatePlans =
                  overlappingRatePlans.size > 0 ? overlappingRatePlans : currentRatePlanIds;
                return (
                  expectedRatePlans.size === 1 &&
                  typeof slice.ratePlan?.id === 'string' &&
                  expectedRatePlans.has(slice.ratePlan.id)
                );
              })
          );
          if (!offer?.timeSlices?.length) {
            throw createApiServiceError(
              'No offer safely preserves the existing rate plans on the requested dates. Provide timeSlices with available rate plans from search_offers; mixed-rate stays require explicit assignments for new or ambiguous time slices.'
            );
          }
          timeSlices = offer.timeSlices.map(slice => ({ ratePlanId: slice.ratePlan.id }));
        } else {
          timeSlices = current.timeSlices?.map((slice: { ratePlan: { id: string } }) => ({
            ratePlanId: slice.ratePlan.id
          }));
        }
      }
      if (!timeSlices?.length) {
        throw createApiServiceError(
          'Provide timeSlices to amend the stay; no existing time slices were returned.'
        );
      }
      await this.api.put(
        `/booking/v1/reservation-actions/${encodeURIComponent(reservationId)}/amend`,
        {
          arrival: body.arrival ?? current.arrival,
          departure: body.departure ?? current.departure,
          adults: body.adults ?? current.adults,
          childrenAges: body.childrenAges ?? current.childrenAges,
          requote: body.requote,
          timeSlices
        }
      );
    }
    if (Object.keys(metadata).length) {
      await this.api.patch(
        `/booking/v1/reservations/${encodeURIComponent(reservationId)}`,
        Object.entries(metadata).map(([key, value]) => ({ op: 'add', path: `/${key}`, value }))
      );
    }
  }

  async cancelReservation(reservationId: string) {
    let response = await this.api.put(
      `/booking/v1/reservation-actions/${encodeURIComponent(reservationId)}/cancel`
    );
    return response.data || {};
  }

  async checkInReservation(reservationId: string) {
    let response = await this.api.put(
      `/booking/v1/reservation-actions/${encodeURIComponent(reservationId)}/checkin`
    );
    return response.data || {};
  }

  async checkOutReservation(reservationId: string) {
    let response = await this.api.put(
      `/booking/v1/reservation-actions/${encodeURIComponent(reservationId)}/checkout`
    );
    return response.data || {};
  }

  async noShowReservation(reservationId: string) {
    let response = await this.api.put(
      `/booking/v1/reservation-actions/${encodeURIComponent(reservationId)}/noshow`
    );
    return response.data || {};
  }

  async assignUnit(reservationId: string, unitId: string) {
    let response = await this.api.put(
      `/booking/v1/reservation-actions/${encodeURIComponent(reservationId)}/assign-unit/${encodeURIComponent(unitId)}`
    );
    return response.data || {};
  }

  async unassignUnit(reservationId: string) {
    let response = await this.api.put(
      `/booking/v1/reservation-actions/${encodeURIComponent(reservationId)}/unassign-units`
    );
    return response.data || {};
  }

  // ─── Bookings ───

  async getBooking(bookingId: string, expand?: string[]) {
    let params: Record<string, any> = {};
    if (expand?.length) params.expand = expand.join(',');
    let response = await this.api.get(
      `/booking/v1/bookings/${encodeURIComponent(bookingId)}`,
      { params }
    );
    return response.data || {};
  }

  async listBookings(
    params: {
      reservationId?: string;
      groupId?: string;
      bookingIds?: string[];
      channelCode?: string[];
      externalCode?: string;
      textSearch?: string;
      hasActivePaymentAccount?: boolean;
      pageNumber?: number;
      pageSize?: number;
      expand?: string[];
    } = {}
  ) {
    let response = await this.api.get('/booking/v1/bookings', {
      params: pickDefined({
        ...params,
        bookingIds: params.bookingIds?.join(','),
        channelCode: params.channelCode?.join(','),
        expand: params.expand?.join(',')
      })
    });
    return response.data || {};
  }

  async getCurrentAccount() {
    let response = await this.api.get('/account/v1/accounts/current');
    return response.data;
  }

  // ─── Properties ───

  async listProperties(params: { pageNumber?: number; pageSize?: number } = {}) {
    let response = await this.api.get('/inventory/v1/properties', {
      params: pickDefined(params)
    });
    return response.data || {};
  }

  async getProperty(propertyId: string) {
    let response = await this.api.get(
      `/inventory/v1/properties/${encodeURIComponent(propertyId)}`
    );
    return response.data || {};
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
    if (params.pageNumber !== undefined) query.pageNumber = params.pageNumber;
    if (params.pageSize !== undefined) query.pageSize = params.pageSize;
    if (params.expand?.length) query.expand = params.expand.join(',');

    let response = await this.api.get('/inventory/v1/units', { params: query });
    return response.data || {};
  }

  async getUnit(unitId: string, expand?: string[]) {
    let params: Record<string, any> = {};
    if (expand?.length) params.expand = expand.join(',');
    let response = await this.api.get(`/inventory/v1/units/${encodeURIComponent(unitId)}`, {
      params
    });
    return response.data || {};
  }

  async changeUnitState(unitId: string, condition: string) {
    let response = await this.api.put('/operations/v1/units-condition', {
      unitsConditions: [{ id: unitId, condition }]
    });
    return response.data || {};
  }

  // ─── Unit Groups (Room Types) ───

  async listUnitGroups(
    params: { propertyId?: string; pageNumber?: number; pageSize?: number } = {}
  ) {
    let query: Record<string, any> = {};
    if (params.propertyId) query.propertyId = params.propertyId;
    if (params.pageNumber !== undefined) query.pageNumber = params.pageNumber;
    if (params.pageSize !== undefined) query.pageSize = params.pageSize;

    let response = await this.api.get('/inventory/v1/unit-groups', { params: query });
    return response.data || {};
  }

  async getUnitGroup(unitGroupId: string) {
    let response = await this.api.get(
      `/inventory/v1/unit-groups/${encodeURIComponent(unitGroupId)}`
    );
    return response.data || {};
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
    if (params.unitGroupId) query.unitGroupIds = params.unitGroupId;
    if (params.channelCode) query.channelCodes = params.channelCode;
    if (params.isSubjectToCityTax !== undefined)
      query.isSubjectToCityTax = params.isSubjectToCityTax;
    if (params.pageNumber !== undefined) query.pageNumber = params.pageNumber;
    if (params.pageSize !== undefined) query.pageSize = params.pageSize;

    let response = await this.api.get('/rateplan/v1/rate-plans', { params: query });
    return response.data || {};
  }

  async getRatePlan(ratePlanId: string) {
    let response = await this.api.get(
      `/rateplan/v1/rate-plans/${encodeURIComponent(ratePlanId)}`
    );
    return response.data || {};
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
    if (params.propertyId) query.propertyIds = params.propertyId;
    if (params.reservationIds?.length) query.reservationIds = params.reservationIds.join(',');
    if (params.bookingId) query.bookingIds = params.bookingId;
    if (params.isEmpty !== undefined) query.isEmpty = params.isEmpty;
    if (params.hasInvoices !== undefined) query.hasInvoices = params.hasInvoices;
    if (params.onlyMain !== undefined) query.onlyMain = params.onlyMain;
    if (params.type) query.type = params.type;
    if (params.pageNumber !== undefined) query.pageNumber = params.pageNumber;
    if (params.pageSize !== undefined) query.pageSize = params.pageSize;
    if (params.expand?.length) query.expand = params.expand.join(',');

    let response = await this.api.get('/finance/v1/folios', { params: query });
    return response.data || {};
  }

  async getFolio(folioId: string, expand?: string[]) {
    let params: Record<string, any> = {};
    if (expand?.length) params.expand = expand.join(',');
    let response = await this.api.get(`/finance/v1/folios/${encodeURIComponent(folioId)}`, {
      params
    });
    return response.data || {};
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
    let response = await this.api.post(
      `/finance/v1/folio-actions/${encodeURIComponent(folioId)}/charges`,
      body
    );
    return response.data || {};
  }

  async postPayment(
    folioId: string,
    body: {
      method: string;
      amount: { amount: number; currency: string };
      receipt?: string;
    }
  ) {
    let response = await this.api.post(
      `/finance/v1/folios/${encodeURIComponent(folioId)}/payments`,
      body
    );
    return response.data || {};
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
    let response = await this.api.post(
      `/finance/v1/folios/${encodeURIComponent(folioId)}/refunds`,
      body
    );
    return response.data || {};
  }

  async closeFolio(folioId: string) {
    let response = await this.api.put(
      `/finance/v1/folio-actions/${encodeURIComponent(folioId)}/close`
    );
    return response.data || {};
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
    if (params.pageNumber !== undefined) query.pageNumber = params.pageNumber;
    if (params.pageSize !== undefined) query.pageSize = params.pageSize;

    let response = await this.api.get('/finance/v1/invoices', { params: query });
    return response.data || {};
  }

  async getInvoice(invoiceId: string) {
    let response = await this.api.get(`/finance/v1/invoices/${encodeURIComponent(invoiceId)}`);
    return response.data || {};
  }

  async createInvoice(folioId: string, languageCode: string) {
    let response = await this.api.post('/finance/v1/invoices', { folioId, languageCode });
    return response.data || {};
  }

  async cancelInvoice(invoiceId: string, reasonCode: string) {
    let response = await this.api.put(
      `/finance/v1/invoice-actions/${encodeURIComponent(invoiceId)}/cancel`,
      { reasonCode }
    );
    return response.data || {};
  }

  async markInvoicePaid(invoiceId: string, paymentMethod: string, receipt: string) {
    let response = await this.api.put(
      `/finance/v1/invoice-actions/${encodeURIComponent(invoiceId)}/pay`,
      { paymentMethod, receipt }
    );
    return response.data || {};
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
    if (params.pageNumber !== undefined) query.pageNumber = params.pageNumber;
    if (params.pageSize !== undefined) query.pageSize = params.pageSize;

    let response = await this.api.get('/rateplan/v1/companies', { params: query });
    return response.data || {};
  }

  async getCompany(companyId: string) {
    let response = await this.api.get(
      `/rateplan/v1/companies/${encodeURIComponent(companyId)}`
    );
    return response.data || {};
  }

  async createCompany(body: {
    code: string;
    name: string;
    propertyId: string;
    canCheckOutOnAr?: boolean;
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
    let response = await this.api.post('/rateplan/v1/companies', {
      ...body,
      canCheckOutOnAr: body.canCheckOutOnAr ?? false
    });
    return response.data || {};
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
    let response = await this.api.patch(
      `/rateplan/v1/companies/${encodeURIComponent(companyId)}`,
      Object.entries(pickDefined(body)).map(([key, value]) => ({
        op: 'replace',
        path: `/${key}`,
        value
      }))
    );
    return response.data || {};
  }

  async deleteCompany(companyId: string) {
    let response = await this.api.delete(
      `/rateplan/v1/companies/${encodeURIComponent(companyId)}`
    );
    return response.data || {};
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
    if (params.propertyId) query.propertyIds = params.propertyId;
    if (params.textSearch) query.textSearch = params.textSearch;
    if (params.pageNumber !== undefined) query.pageNumber = params.pageNumber;
    if (params.pageSize !== undefined) query.pageSize = params.pageSize;

    let response = await this.api.get('/booking/v1/groups', { params: query });
    return response.data || {};
  }

  async getGroup(groupId: string) {
    let response = await this.api.get(`/booking/v1/groups/${encodeURIComponent(groupId)}`);
    return response.data || {};
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
    if (params.propertyId) query.propertyIds = params.propertyId;
    if (params.groupId) query.groupId = params.groupId;
    if (params.status) query.status = params.status;
    if (params.from) query.from = params.from;
    if (params.to) query.to = params.to;
    if (params.pageNumber !== undefined) query.pageNumber = params.pageNumber;
    if (params.pageSize !== undefined) query.pageSize = params.pageSize;

    let response = await this.api.get('/booking/v1/blocks', { params: query });
    return response.data || {};
  }

  async getBlock(blockId: string) {
    let response = await this.api.get(`/booking/v1/blocks/${encodeURIComponent(blockId)}`);
    return response.data || {};
  }

  // ─── Night Audit ───

  async triggerNightAudit(propertyId: string) {
    let response = await this.api.put('/operations/v1/night-audit', undefined, {
      params: { propertyId }
    });
    return response.data || {};
  }

  async getNightAuditStatus(propertyId: string) {
    let response = await this.api.get(
      `/settings/v1/night-audit-actions/${encodeURIComponent(propertyId)}/status`
    );
    return response.data || {};
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
    return response.data || {};
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
    if (params.type) query.types = params.type;
    if (params.pageNumber !== undefined) query.pageNumber = params.pageNumber;
    if (params.pageSize !== undefined) query.pageSize = params.pageSize;

    let response = await this.api.get('/operations/v1/maintenances', { params: query });
    return response.data || {};
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
    if (params.type) query.accountType = params.type;
    if (params.accountNumber) query.accountNumber = params.accountNumber;
    if (params.pageNumber !== undefined) query.pageNumber = params.pageNumber;
    if (params.pageSize !== undefined) query.pageSize = params.pageSize;

    if (!params.from || !params.to) {
      throw createApiServiceError(
        'from and to are required to export accounting transactions.'
      );
    }
    let response = await this.api.post('/finance/v1/accounts/export', undefined, {
      params: query
    });
    return response.data || {};
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

import { createHash } from 'crypto';
import { createAxios } from 'slates';

let api = createAxios({
  baseURL: 'https://www.planyo.com/rest/'
});

export interface PlanyoAuth {
  token: string;
  hashKey?: string;
}

export interface PlanyoConfig {
  siteId?: string;
}

export class PlanyoClient {
  private auth: PlanyoAuth;
  private siteId?: string;

  constructor(auth: PlanyoAuth, config?: PlanyoConfig) {
    this.auth = auth;
    this.siteId = config?.siteId;
  }

  private buildParams(method: string, params: Record<string, any> = {}): Record<string, any> {
    let result: Record<string, any> = {
      method,
      api_key: this.auth.token,
      ...params
    };

    if (this.siteId && !result.site_id) {
      result.site_id = this.siteId;
    }

    if (this.auth.hashKey) {
      let timestamp = Math.floor(Date.now() / 1000).toString();
      let hashInput = this.auth.hashKey + timestamp + method;
      result.hash_timestamp = timestamp;
      result.hash_key = createHash('md5').update(hashInput).digest('hex');
    }

    // Remove undefined/null values
    for (let key of Object.keys(result)) {
      if (result[key] === undefined || result[key] === null) {
        delete result[key];
      }
    }

    return result;
  }

  async call(method: string, params: Record<string, any> = {}): Promise<any> {
    let requestParams = this.buildParams(method, params);

    let response = await api.get('', { params: requestParams });
    let data = response.data;

    if (data.response_code !== 0) {
      throw new Error(
        `Planyo API error (code ${data.response_code}): ${data.response_message}`
      );
    }

    return data.data;
  }

  // Site
  async getSiteInfo(): Promise<any> {
    return this.call('get_site_info');
  }

  // Resources
  async listResources(
    params: {
      detailLevel?: number;
      page?: number;
      listPublishedOnly?: boolean;
      listReservableOnly?: boolean;
      resourceTypes?: string;
      sort?: string;
      customProperties?: Record<string, string>;
    } = {}
  ): Promise<any> {
    let apiParams: Record<string, any> = {};
    if (params.detailLevel !== undefined) apiParams.detail_level = params.detailLevel;
    if (params.page !== undefined) apiParams.page = params.page;
    if (params.listPublishedOnly !== undefined)
      apiParams.list_published_only = params.listPublishedOnly;
    if (params.listReservableOnly !== undefined)
      apiParams.list_reservable_only = params.listReservableOnly;
    if (params.resourceTypes) apiParams.list_resource_types = params.resourceTypes;
    if (params.sort) apiParams.sort = params.sort;
    if (params.customProperties) {
      for (let [key, value] of Object.entries(params.customProperties)) {
        apiParams[`prop_res_${key}`] = value;
      }
    }
    return this.call('list_resources', apiParams);
  }

  async getResourceInfo(resourceId: string): Promise<any> {
    return this.call('get_resource_info', { resource_id: resourceId });
  }

  // Reservations
  async makeReservation(params: {
    resourceId: string;
    startTime: string;
    endTime: string;
    quantity: number;
    email?: string;
    firstName?: string;
    lastName?: string;
    userId?: string;
    adminMode?: boolean;
    sendNotifications?: boolean;
    forceStatus?: string;
    customPrice?: string;
    userNotes?: string;
    adminNotes?: string;
    voucherCode?: string;
    cartId?: string;
    customFields?: Record<string, string>;
    address?: string;
    city?: string;
    zip?: string;
    state?: string;
    country?: string;
    phonePrefix?: string;
    phoneNumber?: string;
    mobilePrefix?: string;
    mobileNumber?: string;
  }): Promise<any> {
    let apiParams: Record<string, any> = {
      resource_id: params.resourceId,
      start_time: params.startTime,
      end_time: params.endTime,
      quantity: params.quantity
    };
    if (params.email) apiParams.email = params.email;
    if (params.firstName) apiParams.first_name = params.firstName;
    if (params.lastName) apiParams.last_name = params.lastName;
    if (params.userId) apiParams.user_id = params.userId;
    if (params.adminMode !== undefined) apiParams.admin_mode = params.adminMode;
    if (params.sendNotifications !== undefined)
      apiParams.send_notifications = params.sendNotifications;
    if (params.forceStatus) apiParams.force_status = params.forceStatus;
    if (params.customPrice) apiParams.custom_price = params.customPrice;
    if (params.userNotes) apiParams.user_notes = params.userNotes;
    if (params.adminNotes) apiParams.admin_notes = params.adminNotes;
    if (params.voucherCode) apiParams.rental_prop_voucher = params.voucherCode;
    if (params.cartId) apiParams.cart_id = params.cartId;
    if (params.address) apiParams.address = params.address;
    if (params.city) apiParams.city = params.city;
    if (params.zip) apiParams.zip = params.zip;
    if (params.state) apiParams.state = params.state;
    if (params.country) apiParams.country = params.country;
    if (params.phonePrefix) apiParams.phone_prefix = params.phonePrefix;
    if (params.phoneNumber) apiParams.phone_number = params.phoneNumber;
    if (params.mobilePrefix) apiParams.mobile_prefix = params.mobilePrefix;
    if (params.mobileNumber) apiParams.mobile_number = params.mobileNumber;
    if (params.customFields) {
      for (let [key, value] of Object.entries(params.customFields)) {
        apiParams[`rental_prop_${key}`] = value;
      }
    }
    return this.call('make_reservation', apiParams);
  }

  async modifyReservation(params: {
    reservationId: string;
    resourceId?: string;
    startTime?: string;
    endTime?: string;
    quantity?: number;
    userId?: string;
    adminMode?: boolean;
    sendNotifications?: boolean;
    recalculatePrice?: boolean;
    comments?: string;
    customFields?: Record<string, string>;
  }): Promise<any> {
    let apiParams: Record<string, any> = {
      reservation_id: params.reservationId
    };
    if (params.resourceId) apiParams.resource_id = params.resourceId;
    if (params.startTime) apiParams.start_time = params.startTime;
    if (params.endTime) apiParams.end_time = params.endTime;
    if (params.quantity !== undefined) apiParams.quantity = params.quantity;
    if (params.userId) apiParams.user_id = params.userId;
    if (params.adminMode !== undefined) apiParams.admin_mode = params.adminMode;
    if (params.sendNotifications !== undefined)
      apiParams.send_notifications = params.sendNotifications;
    if (params.recalculatePrice !== undefined)
      apiParams.recalculate_price = params.recalculatePrice;
    if (params.comments) apiParams.comments = params.comments;
    if (params.customFields) {
      for (let [key, value] of Object.entries(params.customFields)) {
        apiParams[`rental_prop_${key}`] = value;
      }
    }
    return this.call('modify_reservation', apiParams);
  }

  async doReservationAction(
    reservationId: string,
    action: string,
    params: {
      comment?: string;
      isQuiet?: boolean;
    } = {}
  ): Promise<any> {
    let apiParams: Record<string, any> = {
      reservation_id: reservationId,
      action
    };
    if (params.comment) apiParams.comment = params.comment;
    if (params.isQuiet !== undefined) apiParams.is_quiet = params.isQuiet;
    return this.call('do_reservation_action', apiParams);
  }

  async deleteReservation(reservationId: string, deleteOrphanedUser?: boolean): Promise<any> {
    let apiParams: Record<string, any> = {
      reservation_id: reservationId
    };
    if (deleteOrphanedUser !== undefined)
      apiParams.delete_user_without_reservations = deleteOrphanedUser;
    return this.call('delete_reservation', apiParams);
  }

  async getReservationData(reservationId: string): Promise<any> {
    return this.call('get_reservation_data', { reservation_id: reservationId });
  }

  async listReservations(params: {
    startTime: string;
    endTime: string;
    resourceId?: string;
    userId?: string;
    userEmail?: string;
    requiredStatus?: string;
    excludedStatus?: string;
    modifiedSince?: string;
    listByCreationDate?: boolean;
    sort?: string;
    sortReverse?: boolean;
    page?: number;
    detailLevel?: number;
    customProperties?: Record<string, string>;
  }): Promise<any> {
    let apiParams: Record<string, any> = {
      start_time: params.startTime,
      end_time: params.endTime
    };
    if (params.resourceId) apiParams.resource_id = params.resourceId;
    if (params.userId) apiParams.user_id = params.userId;
    if (params.userEmail) apiParams.user_email = params.userEmail;
    if (params.requiredStatus) apiParams.required_status = params.requiredStatus;
    if (params.excludedStatus) apiParams.excluded_status = params.excludedStatus;
    if (params.modifiedSince) apiParams.modified_since = params.modifiedSince;
    if (params.listByCreationDate !== undefined)
      apiParams.list_by_creation_date = params.listByCreationDate;
    if (params.sort) apiParams.sort = params.sort;
    if (params.sortReverse !== undefined) apiParams.sort_reverse = params.sortReverse;
    if (params.page !== undefined) apiParams.page = params.page;
    if (params.detailLevel !== undefined) apiParams.detail_level = params.detailLevel;
    if (params.customProperties) {
      for (let [key, value] of Object.entries(params.customProperties)) {
        apiParams[`rental_prop_${key}`] = value;
      }
    }
    return this.call('list_reservations', apiParams);
  }

  // Availability
  async isResourceAvailable(params: {
    resourceId: string;
    startTime: string;
    endTime: string;
    quantity: number;
  }): Promise<any> {
    return this.call('is_resource_available', {
      resource_id: params.resourceId,
      start_time: params.startTime,
      end_time: params.endTime,
      quantity: params.quantity
    });
  }

  async canMakeReservation(params: {
    resourceId: string;
    startTime: string;
    endTime: string;
    quantity: number;
    adminMode?: boolean;
    returnPrice?: boolean;
    userId?: string;
  }): Promise<any> {
    let apiParams: Record<string, any> = {
      resource_id: params.resourceId,
      start_time: params.startTime,
      end_time: params.endTime,
      quantity: params.quantity
    };
    if (params.adminMode !== undefined) apiParams.admin_mode = params.adminMode;
    if (params.returnPrice !== undefined) apiParams.return_price = params.returnPrice;
    if (params.userId) apiParams.user_id = params.userId;
    return this.call('can_make_reservation', apiParams);
  }

  async getResourceUsage(params: {
    startDate: string;
    endDate: string;
    resourceId?: string;
    separatePeriods?: boolean;
  }): Promise<any> {
    let apiParams: Record<string, any> = {
      start_date: params.startDate,
      end_date: params.endDate,
      separate_periods: params.separatePeriods ?? true
    };
    if (params.resourceId) apiParams.resource_id = params.resourceId;
    return this.call('get_resource_usage', apiParams);
  }

  // Pricing
  async getRentalPrice(params: {
    resourceId: string;
    startTime: string;
    endTime: string;
    quantity: number;
    userId?: string;
    voucherCode?: string;
    customFields?: Record<string, string>;
  }): Promise<any> {
    let apiParams: Record<string, any> = {
      resource_id: params.resourceId,
      start_time: params.startTime,
      end_time: params.endTime,
      quantity: params.quantity
    };
    if (params.userId) apiParams.user_id = params.userId;
    if (params.voucherCode) apiParams.rental_prop_voucher = params.voucherCode;
    if (params.customFields) {
      for (let [key, value] of Object.entries(params.customFields)) {
        apiParams[`rental_prop_${key}`] = value;
      }
    }
    return this.call('get_rental_price', apiParams);
  }

  // Payments
  async addReservationPayment(params: {
    reservationId: string;
    paymentMode: number;
    paymentStatus: number;
    transactionId: string;
    amount: number;
    currency: string;
    paymentTime?: string;
    extraInfo?: string;
    isQuiet?: boolean;
  }): Promise<any> {
    let apiParams: Record<string, any> = {
      reservation_id: params.reservationId,
      payment_mode: params.paymentMode,
      payment_status: params.paymentStatus,
      transaction_id: params.transactionId,
      amount: params.amount,
      currency: params.currency
    };
    if (params.paymentTime) apiParams.payment_time = params.paymentTime;
    if (params.extraInfo) apiParams.extra_info = params.extraInfo;
    if (params.isQuiet !== undefined) apiParams.is_quiet = params.isQuiet;
    return this.call('add_reservation_payment', apiParams);
  }

  async listPayments(params: {
    startDate: string;
    endDate: string;
    resourceId?: string;
    paymentModeIdFilter?: number;
    status?: number;
  }): Promise<any> {
    let apiParams: Record<string, any> = {
      start_date: params.startDate,
      end_date: params.endDate
    };
    if (params.resourceId) apiParams.resource_id = params.resourceId;
    if (params.paymentModeIdFilter !== undefined)
      apiParams.payment_mode_id_filter = params.paymentModeIdFilter;
    if (params.status !== undefined) apiParams.status = params.status;
    return this.call('list_payments', apiParams);
  }

  async listReservationPayments(reservationId: string): Promise<any> {
    return this.call('list_reservation_payments', { reservation_id: reservationId });
  }

  // Users
  async getUserData(params: {
    userId?: string;
    email?: string;
    detailLevel?: number;
  }): Promise<any> {
    let apiParams: Record<string, any> = {};
    if (params.userId) apiParams.user_id = params.userId;
    if (params.email) apiParams.email = params.email;
    if (params.detailLevel !== undefined) apiParams.detail_level = params.detailLevel;
    return this.call('get_user_data', apiParams);
  }

  async addUser(params: {
    email: string;
    firstName: string;
    lastName?: string;
    password?: string;
    country?: string;
    address?: string;
    city?: string;
    zip?: string;
    state?: string;
    phone?: string;
    phoneCountryCode?: string;
    mobile?: string;
    mobileCountryCode?: string;
    language?: string;
    customProperties?: Record<string, string>;
  }): Promise<any> {
    let apiParams: Record<string, any> = {
      email: params.email,
      first_name: params.firstName
    };
    if (params.lastName) apiParams.last_name = params.lastName;
    if (params.password) apiParams.user_password = params.password;
    if (params.country) apiParams.country = params.country;
    if (params.address) apiParams.address = params.address;
    if (params.city) apiParams.city = params.city;
    if (params.zip) apiParams.zip = params.zip;
    if (params.state) apiParams.state = params.state;
    if (params.phone) apiParams.phone = params.phone;
    if (params.phoneCountryCode) apiParams.phone_country_code = params.phoneCountryCode;
    if (params.mobile) apiParams.mobile = params.mobile;
    if (params.mobileCountryCode) apiParams.mobile_country_code = params.mobileCountryCode;
    if (params.language) apiParams.user_language = params.language;
    if (params.customProperties) {
      for (let [key, value] of Object.entries(params.customProperties)) {
        apiParams[`prop_user_${key}`] = value;
      }
    }
    return this.call('add_user', apiParams);
  }

  async modifyUser(params: {
    userId?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    newEmail?: string;
    country?: string;
    address?: string;
    city?: string;
    zip?: string;
    state?: string;
    phone?: string;
    phoneCountryCode?: string;
    mobile?: string;
    mobileCountryCode?: string;
    language?: string;
    emailVerified?: boolean;
    isPreapproved?: boolean;
    isBanned?: boolean;
    customProperties?: Record<string, string>;
  }): Promise<any> {
    let apiParams: Record<string, any> = {};
    if (params.userId) apiParams.user_id = params.userId;
    if (params.email) apiParams.email = params.email;
    if (params.firstName) apiParams.first_name = params.firstName;
    if (params.lastName) apiParams.last_name = params.lastName;
    if (params.newEmail) apiParams.new_email = params.newEmail;
    if (params.country) apiParams.country = params.country;
    if (params.address) apiParams.address = params.address;
    if (params.city) apiParams.city = params.city;
    if (params.zip) apiParams.zip = params.zip;
    if (params.state) apiParams.state = params.state;
    if (params.phone) apiParams.phone = params.phone;
    if (params.phoneCountryCode) apiParams.phone_country_code = params.phoneCountryCode;
    if (params.mobile) apiParams.mobile = params.mobile;
    if (params.mobileCountryCode) apiParams.mobile_country_code = params.mobileCountryCode;
    if (params.language) apiParams.user_language = params.language;
    if (params.emailVerified !== undefined) apiParams.email_verified = params.emailVerified;
    if (params.isPreapproved !== undefined) apiParams.is_preapproved = params.isPreapproved;
    if (params.isBanned !== undefined) apiParams.is_banned = params.isBanned;
    if (params.customProperties) {
      for (let [key, value] of Object.entries(params.customProperties)) {
        apiParams[`prop_user_${key}`] = value;
      }
    }
    return this.call('modify_user', apiParams);
  }

  async listUsers(
    params: {
      page?: number;
      detailLevel?: number;
      firstName?: string;
      lastName?: string;
      email?: string;
      country?: string;
      city?: string;
      modifiedSince?: string;
      filterName?: string;
      filterValue?: string;
      filterValueInclusive?: string;
    } = {}
  ): Promise<any> {
    let apiParams: Record<string, any> = {};
    if (params.page !== undefined) apiParams.page = params.page;
    if (params.detailLevel !== undefined) apiParams.detail_level = params.detailLevel;
    if (params.firstName) apiParams.first_name = params.firstName;
    if (params.lastName) apiParams.last_name = params.lastName;
    if (params.email) apiParams.email = params.email;
    if (params.country) apiParams.country = params.country;
    if (params.city) apiParams.city = params.city;
    if (params.modifiedSince) apiParams.modified_since = params.modifiedSince;
    if (params.filterName) apiParams.user_filter_name = params.filterName;
    if (params.filterValue) apiParams.user_filter_value = params.filterValue;
    if (params.filterValueInclusive)
      apiParams.user_filter_value_inc = params.filterValueInclusive;
    return this.call('list_users', apiParams);
  }

  // Vouchers
  async createVoucher(params: {
    quantity: number;
    voucherCodePrefix: string;
    discountValue: string;
    reservationStartTime: string;
    reservationEndTime: string;
    voucherTitle?: string;
    rentalStartTime?: string;
    rentalEndTime?: string;
    resources?: string;
    nonCombinable?: boolean;
    isOnePerCustomer?: boolean;
    includeProducts?: boolean;
    uniqueCodes?: string;
  }): Promise<any> {
    let apiParams: Record<string, any> = {
      quantity: params.quantity,
      voucher_code_prefix: params.voucherCodePrefix,
      discount_value: params.discountValue,
      reservation_start_time: params.reservationStartTime,
      reservation_end_time: params.reservationEndTime
    };
    if (params.voucherTitle) apiParams.voucher_title = params.voucherTitle;
    if (params.rentalStartTime) apiParams.rental_start_time = params.rentalStartTime;
    if (params.rentalEndTime) apiParams.rental_end_time = params.rentalEndTime;
    if (params.resources) apiParams.resources = params.resources;
    if (params.nonCombinable !== undefined) apiParams.non_combinable = params.nonCombinable;
    if (params.isOnePerCustomer !== undefined)
      apiParams.is_one_per_customer = params.isOnePerCustomer;
    if (params.includeProducts !== undefined)
      apiParams.include_products = params.includeProducts;
    if (params.uniqueCodes) apiParams.unique_codes = params.uniqueCodes;
    return this.call('create_voucher', apiParams);
  }

  async listVouchers(
    params: {
      rentalStartTime?: string;
      rentalEndTime?: string;
      resourceId?: string;
      voucherCodePrefix?: string;
    } = {}
  ): Promise<any> {
    let apiParams: Record<string, any> = {};
    if (params.rentalStartTime) apiParams.rental_start_time = params.rentalStartTime;
    if (params.rentalEndTime) apiParams.rental_end_time = params.rentalEndTime;
    if (params.resourceId) apiParams.resource_id = params.resourceId;
    if (params.voucherCodePrefix) apiParams.voucher_code_prefix = params.voucherCodePrefix;
    return this.call('list_vouchers', apiParams);
  }

  // Coupons
  async addCouponType(params: {
    type: number;
    amount: number;
    price: number;
    resourceIds?: string;
    label?: string;
    isPersonal?: boolean;
    validityLimitDays?: number;
    discountAmount?: number;
    accessType?: string;
    purchaseLimit?: number;
  }): Promise<any> {
    let apiParams: Record<string, any> = {
      type: params.type,
      amount: params.amount,
      price: params.price
    };
    if (params.resourceIds) apiParams.resource_ids = params.resourceIds;
    if (params.label) apiParams.label = params.label;
    if (params.isPersonal !== undefined) apiParams.is_personal = params.isPersonal;
    if (params.validityLimitDays !== undefined)
      apiParams.validity_limit_days = params.validityLimitDays;
    if (params.discountAmount !== undefined) apiParams.discount_amount = params.discountAmount;
    if (params.accessType) apiParams.access_type = params.accessType;
    if (params.purchaseLimit !== undefined) apiParams.purchase_limit = params.purchaseLimit;
    return this.call('add_coupon_type', apiParams);
  }

  async listCouponTypes(
    params: { resourceId?: string; includeUnpublished?: boolean } = {}
  ): Promise<any> {
    let apiParams: Record<string, any> = {};
    if (params.resourceId) apiParams.resource_id = params.resourceId;
    if (params.includeUnpublished !== undefined)
      apiParams.include_unpublished = params.includeUnpublished;
    return this.call('list_coupon_types', apiParams);
  }

  // Webhooks
  async addNotificationCallback(notificationName: string, callbackUrl: string): Promise<any> {
    return this.call('add_notification_callback', {
      notification_name: notificationName,
      callback_url: callbackUrl
    });
  }

  async removeNotificationCallback(
    notificationName: string,
    callbackUrl?: string
  ): Promise<any> {
    let apiParams: Record<string, any> = {
      notification_name: notificationName
    };
    if (callbackUrl) apiParams.callback_url = callbackUrl;
    return this.call('remove_notification_callback', apiParams);
  }
}

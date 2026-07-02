import { createAxios } from 'slates';

export class Client {
  private http: ReturnType<typeof createAxios>;
  private apiKey: string;

  constructor(config: { token: string }) {
    this.apiKey = config.token;
    this.http = createAxios({
      baseURL: 'https://api.route4me.com',
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  private params(extra: Record<string, any> = {}) {
    return { api_key: this.apiKey, ...extra };
  }

  // ── Optimization ──────────────────────────────────────────

  async createOptimization(body: Record<string, any>) {
    let response = await this.http.post('/api.v4/optimization_problem.php', body, {
      params: this.params()
    });
    return response.data;
  }

  async getOptimization(optimizationProblemId: string) {
    let response = await this.http.get('/api.v4/optimization_problem.php', {
      params: this.params({ optimization_problem_id: optimizationProblemId })
    });
    return response.data;
  }

  async getOptimizations(options: { limit?: number; offset?: number; state?: string } = {}) {
    let response = await this.http.get('/api.v4/optimization_problem.php', {
      params: this.params({
        limit: options.limit,
        offset: options.offset,
        state: options.state
      })
    });
    return response.data;
  }

  async updateOptimization(optimizationProblemId: string, body: Record<string, any>) {
    let response = await this.http.put('/api.v4/optimization_problem.php', body, {
      params: this.params({ optimization_problem_id: optimizationProblemId })
    });
    return response.data;
  }

  async deleteOptimization(optimizationProblemIds: string[]) {
    let response = await this.http.delete('/api.v4/optimization_problem.php', {
      params: this.params(),
      data: { optimization_problem_ids: optimizationProblemIds }
    });
    return response.data;
  }

  // ── Routes ────────────────────────────────────────────────

  async getRoute(routeId: string, options: Record<string, any> = {}) {
    let response = await this.http.get('/api.v4/route.php', {
      params: this.params({ route_id: routeId, ...options })
    });
    return response.data;
  }

  async getRoutes(options: { limit?: number; offset?: number } = {}) {
    let response = await this.http.get('/api.v4/route.php', {
      params: this.params({ limit: options.limit, offset: options.offset })
    });
    return response.data;
  }

  async updateRoute(routeId: string, body: Record<string, any>) {
    let response = await this.http.put('/api.v4/route.php', body, {
      params: this.params({ route_id: routeId })
    });
    return response.data;
  }

  async deleteRoute(routeId: string) {
    let response = await this.http.delete('/api.v4/route.php', {
      params: this.params({ route_id: routeId })
    });
    return response.data;
  }

  async duplicateRoute(routeId: string) {
    let response = await this.http.post('/api.v4/route.php', null, {
      params: this.params({ route_id: routeId, to: 'none', redirect: 0 })
    });
    return response.data;
  }

  async resequenceRoute(
    routeId: string,
    addresses: Array<{ route_destination_id: number; sequence_no: number }>
  ) {
    let response = await this.http.put(
      '/api.v4/route.php',
      { addresses },
      {
        params: this.params({ route_id: routeId })
      }
    );
    return response.data;
  }

  // ── Route Addresses ───────────────────────────────────────

  async addRouteAddresses(routeId: string, addresses: Record<string, any>[]) {
    let response = await this.http.put(
      '/api.v4/route.php',
      { addresses },
      {
        params: this.params({ route_id: routeId })
      }
    );
    return response.data;
  }

  async removeRouteAddress(routeId: string, routeDestinationId: number) {
    let response = await this.http.delete('/api.v4/address.php', {
      params: this.params({ route_id: routeId, route_destination_id: routeDestinationId })
    });
    return response.data;
  }

  // ── Orders ────────────────────────────────────────────────

  async createOrder(body: Record<string, any>) {
    let response = await this.http.post('/api.v4/order.php', body, {
      params: this.params()
    });
    return response.data;
  }

  async getOrder(orderId: string) {
    let response = await this.http.get('/api.v4/order.php', {
      params: this.params({ order_id: orderId })
    });
    return response.data;
  }

  async getOrders(options: { limit?: number; offset?: number } = {}) {
    let response = await this.http.get('/api.v4/order.php', {
      params: this.params({ limit: options.limit, offset: options.offset })
    });
    return response.data;
  }

  async updateOrder(body: Record<string, any>) {
    let response = await this.http.put('/api.v4/order.php', body, {
      params: this.params()
    });
    return response.data;
  }

  async deleteOrder(orderIds: number[]) {
    let response = await this.http.delete('/api.v4/order.php', {
      params: this.params(),
      data: { order_ids: orderIds }
    });
    return response.data;
  }

  // ── Address Book (Contacts) ───────────────────────────────

  async createContact(body: Record<string, any>) {
    let response = await this.http.post('/api.v4/address_book.php', body, {
      params: this.params()
    });
    return response.data;
  }

  async getContacts(
    options: { limit?: number; offset?: number; query?: string; addressId?: string } = {}
  ) {
    let params: Record<string, any> = {};
    if (options.addressId) params.address_id = options.addressId;
    if (options.limit) params.limit = options.limit;
    if (options.offset) params.offset = options.offset;
    if (options.query) params.query = options.query;
    let response = await this.http.get('/api.v4/address_book.php', {
      params: this.params(params)
    });
    return response.data;
  }

  async updateContact(body: Record<string, any>) {
    let response = await this.http.put('/api.v4/address_book.php', body, {
      params: this.params()
    });
    return response.data;
  }

  async deleteContacts(addressIds: number[]) {
    let response = await this.http.delete('/api.v4/address_book.php', {
      params: this.params(),
      data: { address_ids: addressIds }
    });
    return response.data;
  }

  // ── Geocoding ─────────────────────────────────────────────

  async geocodeAddress(address: string) {
    let response = await this.http.post(
      '/api/geocoder.php',
      { strExportFormat: 'json', addresses: address },
      {
        params: this.params({ format: 'json' })
      }
    );
    return response.data;
  }

  async reverseGeocode(lat: number, lng: number) {
    let response = await this.http.get('/api/geocoder.php', {
      params: this.params({ format: 'json', addresses: `${lat},${lng}` })
    });
    return response.data;
  }

  // ── GPS Tracking ──────────────────────────────────────────

  async setGps(body: Record<string, any>) {
    let response = await this.http.get('/track/set.php', {
      params: this.params(body)
    });
    return response.data;
  }

  async getTrackingHistory(
    routeId: string,
    options: { period?: string; start?: number; end?: number } = {}
  ) {
    let response = await this.http.get('/api.v4/route.php', {
      params: this.params({
        route_id: routeId,
        device_tracking_history: 1,
        ...options
      })
    });
    return response.data;
  }

  // ── Team Members ──────────────────────────────────────────

  async getUsers() {
    let response = await this.http.get('/api.v4/user.php', {
      params: this.params()
    });
    return response.data;
  }

  async getUser() {
    let response = await this.http.get('/api.v4/user.php', {
      params: this.params()
    });
    return response.data;
  }

  async createMember(body: Record<string, any>) {
    let response = await this.http.post('/api.v4/user.php', body, {
      params: this.params()
    });
    return response.data;
  }

  async updateMember(body: Record<string, any>) {
    let response = await this.http.put('/api.v4/user.php', body, {
      params: this.params()
    });
    return response.data;
  }

  async deleteMember(memberId: number) {
    let response = await this.http.delete('/api.v4/user.php', {
      params: this.params({ member_id: memberId })
    });
    return response.data;
  }

  // ── Vehicles ──────────────────────────────────────────────

  async getVehicles() {
    let response = await this.http.get('/api/vehicles', {
      params: this.params()
    });
    return response.data;
  }

  async getVehicle(vehicleId: string) {
    let response = await this.http.get(`/api/vehicles/${vehicleId}`, {
      params: this.params()
    });
    return response.data;
  }

  async createVehicle(body: Record<string, any>) {
    let response = await this.http.post('/api/vehicles', body, {
      params: this.params()
    });
    return response.data;
  }

  async updateVehicle(vehicleId: string, body: Record<string, any>) {
    let response = await this.http.put(`/api/vehicles/${vehicleId}`, body, {
      params: this.params()
    });
    return response.data;
  }

  async deleteVehicle(vehicleId: string) {
    let response = await this.http.delete(`/api/vehicles/${vehicleId}`, {
      params: this.params()
    });
    return response.data;
  }

  // ── Notes ─────────────────────────────────────────────────

  async addNote(routeId: string, routeDestinationId: number, body: Record<string, any>) {
    let response = await this.http.post('/api.v4/address.php', body, {
      params: this.params({
        route_id: routeId,
        address_id: routeDestinationId,
        dev_lat: body.dev_lat || 0,
        dev_lng: body.dev_lng || 0,
        strUpdateType: body.strUpdateType || 'dropoff'
      })
    });
    return response.data;
  }

  async getNotes(routeId: string, routeDestinationId: number) {
    let response = await this.http.get('/api.v4/address.php', {
      params: this.params({
        route_id: routeId,
        route_destination_id: routeDestinationId,
        notes: 1
      })
    });
    return response.data;
  }

  // ── Activity Feed ─────────────────────────────────────────

  async getActivities(
    options: {
      routeId?: string;
      activityType?: string;
      limit?: number;
      offset?: number;
      start?: number;
      end?: number;
    } = {}
  ) {
    let params: Record<string, any> = {};
    if (options.routeId) params.route_id = options.routeId;
    if (options.activityType) params.activity_type = options.activityType;
    if (options.limit) params.limit = options.limit;
    if (options.offset) params.offset = options.offset;
    if (options.start) params.start = options.start;
    if (options.end) params.end = options.end;
    let response = await this.http.get('/api/get_activities.php', {
      params: this.params(params)
    });
    return response.data;
  }

  async logActivity(body: Record<string, any>) {
    let response = await this.http.post('/api.v4/activity_feed.php', body, {
      params: this.params()
    });
    return response.data;
  }

  // ── Avoidance Zones ───────────────────────────────────────

  async getAvoidanceZones() {
    let response = await this.http.get('/api.v4/avoidance.php', {
      params: this.params()
    });
    return response.data;
  }

  async getAvoidanceZone(territoryId: string) {
    let response = await this.http.get('/api.v4/avoidance.php', {
      params: this.params({ territory_id: territoryId })
    });
    return response.data;
  }

  async createAvoidanceZone(body: Record<string, any>) {
    let response = await this.http.post('/api.v4/avoidance.php', body, {
      params: this.params()
    });
    return response.data;
  }

  async updateAvoidanceZone(territoryId: string, body: Record<string, any>) {
    let response = await this.http.put('/api.v4/avoidance.php', body, {
      params: this.params({ territory_id: territoryId })
    });
    return response.data;
  }

  async deleteAvoidanceZone(territoryId: string) {
    let response = await this.http.delete('/api.v4/avoidance.php', {
      params: this.params({ territory_id: territoryId })
    });
    return response.data;
  }

  // ── Territories ───────────────────────────────────────────

  async getTerritories() {
    let response = await this.http.get('/api.v4/territory.php', {
      params: this.params()
    });
    return response.data;
  }

  async getTerritory(territoryId: string) {
    let response = await this.http.get('/api.v4/territory.php', {
      params: this.params({ territory_id: territoryId })
    });
    return response.data;
  }

  async createTerritory(body: Record<string, any>) {
    let response = await this.http.post('/api.v4/territory.php', body, {
      params: this.params()
    });
    return response.data;
  }

  async updateTerritory(territoryId: string, body: Record<string, any>) {
    let response = await this.http.put('/api.v4/territory.php', body, {
      params: this.params({ territory_id: territoryId })
    });
    return response.data;
  }

  async deleteTerritory(territoryId: string) {
    let response = await this.http.delete('/api.v4/territory.php', {
      params: this.params({ territory_id: territoryId })
    });
    return response.data;
  }
}

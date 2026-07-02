import { createAxios } from 'slates';

let api = createAxios({
  baseURL: 'https://www.strava.com/api/v3'
});

export class Client {
  private headers: Record<string, string>;

  constructor(config: { token: string }) {
    this.headers = {
      Authorization: `Bearer ${config.token}`
    };
  }

  // ── Athlete ──

  async getAuthenticatedAthlete(): Promise<any> {
    let response = await api.get('/athlete', { headers: this.headers });
    return response.data;
  }

  async getAthleteStats(athleteId: number): Promise<any> {
    let response = await api.get(`/athletes/${athleteId}/stats`, { headers: this.headers });
    return response.data;
  }

  async getAthleteZones(): Promise<any> {
    let response = await api.get('/athlete/zones', { headers: this.headers });
    return response.data;
  }

  async updateAthlete(params: { weight?: number }): Promise<any> {
    let response = await api.put('/athlete', params, { headers: this.headers });
    return response.data;
  }

  // ── Activities ──

  async listAthleteActivities(params?: {
    before?: number;
    after?: number;
    page?: number;
    perPage?: number;
  }): Promise<any[]> {
    let response = await api.get('/athlete/activities', {
      headers: this.headers,
      params: {
        before: params?.before,
        after: params?.after,
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return response.data;
  }

  async getActivity(activityId: number, includeAllEfforts?: boolean): Promise<any> {
    let response = await api.get(`/activities/${activityId}`, {
      headers: this.headers,
      params: { include_all_efforts: includeAllEfforts }
    });
    return response.data;
  }

  async createActivity(params: {
    name: string;
    sportType: string;
    startDateLocal: string;
    elapsedTime: number;
    description?: string;
    distance?: number;
    trainer?: boolean;
    commute?: boolean;
    hideFromHome?: boolean;
  }): Promise<any> {
    let response = await api.post(
      '/activities',
      {
        name: params.name,
        sport_type: params.sportType,
        start_date_local: params.startDateLocal,
        elapsed_time: params.elapsedTime,
        description: params.description,
        distance: params.distance,
        trainer: params.trainer ? 1 : 0,
        commute: params.commute ? 1 : 0,
        hide_from_home: params.hideFromHome
      },
      { headers: this.headers }
    );
    return response.data;
  }

  async updateActivity(
    activityId: number,
    params: {
      name?: string;
      sportType?: string;
      description?: string;
      trainer?: boolean;
      commute?: boolean;
      hideFromHome?: boolean;
      gearId?: string;
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (params.name !== undefined) body.name = params.name;
    if (params.sportType !== undefined) body.sport_type = params.sportType;
    if (params.description !== undefined) body.description = params.description;
    if (params.trainer !== undefined) body.trainer = params.trainer;
    if (params.commute !== undefined) body.commute = params.commute;
    if (params.hideFromHome !== undefined) body.hide_from_home = params.hideFromHome;
    if (params.gearId !== undefined) body.gear_id = params.gearId;

    let response = await api.put(`/activities/${activityId}`, body, { headers: this.headers });
    return response.data;
  }

  async getActivityComments(
    activityId: number,
    params?: {
      page?: number;
      perPage?: number;
      pageSize?: number;
      afterCursor?: string;
    }
  ): Promise<any[]> {
    let response = await api.get(`/activities/${activityId}/comments`, {
      headers: this.headers,
      params: {
        page: params?.page,
        per_page: params?.perPage,
        page_size: params?.pageSize,
        after_cursor: params?.afterCursor
      }
    });
    return response.data;
  }

  async getActivityKudoers(
    activityId: number,
    params?: {
      page?: number;
      perPage?: number;
    }
  ): Promise<any[]> {
    let response = await api.get(`/activities/${activityId}/kudos`, {
      headers: this.headers,
      params: {
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return response.data;
  }

  async getActivityLaps(activityId: number): Promise<any[]> {
    let response = await api.get(`/activities/${activityId}/laps`, { headers: this.headers });
    return response.data;
  }

  async getActivityZones(activityId: number): Promise<any[]> {
    let response = await api.get(`/activities/${activityId}/zones`, { headers: this.headers });
    return response.data;
  }

  // ── Activity Streams ──

  async getActivityStreams(activityId: number, streamTypes: string[]): Promise<any> {
    let response = await api.get(`/activities/${activityId}/streams`, {
      headers: this.headers,
      params: {
        keys: streamTypes.join(','),
        key_type: 'time'
      }
    });
    return response.data;
  }

  // ── Uploads ──

  async uploadActivity(params: {
    file: string;
    name?: string;
    description?: string;
    trainer?: boolean;
    commute?: boolean;
    dataType: string;
    externalId?: string;
  }): Promise<any> {
    let response = await api.post(
      '/uploads',
      {
        file: params.file,
        name: params.name,
        description: params.description,
        trainer: params.trainer ? '1' : '0',
        commute: params.commute ? '1' : '0',
        data_type: params.dataType,
        external_id: params.externalId
      },
      { headers: this.headers }
    );
    return response.data;
  }

  async getUpload(uploadId: number): Promise<any> {
    let response = await api.get(`/uploads/${uploadId}`, { headers: this.headers });
    return response.data;
  }

  // ── Segments ──

  async getSegment(segmentId: number): Promise<any> {
    let response = await api.get(`/segments/${segmentId}`, { headers: this.headers });
    return response.data;
  }

  async exploreSegments(params: {
    bounds: string;
    activityType?: 'running' | 'riding';
    minCat?: number;
    maxCat?: number;
  }): Promise<any> {
    let response = await api.get('/segments/explore', {
      headers: this.headers,
      params: {
        bounds: params.bounds,
        activity_type: params.activityType,
        min_cat: params.minCat,
        max_cat: params.maxCat
      }
    });
    return response.data;
  }

  async getStarredSegments(params?: { page?: number; perPage?: number }): Promise<any[]> {
    let response = await api.get('/segments/starred', {
      headers: this.headers,
      params: {
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return response.data;
  }

  async starSegment(segmentId: number, starred: boolean): Promise<any> {
    let response = await api.put(
      `/segments/${segmentId}/starred`,
      {
        starred
      },
      { headers: this.headers }
    );
    return response.data;
  }

  // ── Segment Efforts ──

  async getSegmentEffort(effortId: number): Promise<any> {
    let response = await api.get(`/segment_efforts/${effortId}`, { headers: this.headers });
    return response.data;
  }

  async listSegmentEfforts(
    segmentId: number,
    params?: {
      startDateLocal?: string;
      endDateLocal?: string;
      perPage?: number;
    }
  ): Promise<any[]> {
    let response = await api.get(`/segments/${segmentId}/all_efforts`, {
      headers: this.headers,
      params: {
        start_date_local: params?.startDateLocal,
        end_date_local: params?.endDateLocal,
        per_page: params?.perPage
      }
    });
    return response.data;
  }

  async getSegmentEffortStreams(effortId: number, streamTypes: string[]): Promise<any> {
    let response = await api.get(`/segment_efforts/${effortId}/streams`, {
      headers: this.headers,
      params: {
        keys: streamTypes.join(','),
        key_type: 'time'
      }
    });
    return response.data;
  }

  // ── Routes ──

  async getRoute(routeId: number): Promise<any> {
    let response = await api.get(`/routes/${routeId}`, { headers: this.headers });
    return response.data;
  }

  async listAthleteRoutes(
    athleteId: number,
    params?: {
      page?: number;
      perPage?: number;
    }
  ): Promise<any[]> {
    let response = await api.get(`/athletes/${athleteId}/routes`, {
      headers: this.headers,
      params: {
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return response.data;
  }

  async exportRouteGpx(routeId: number): Promise<string> {
    let response = await api.get(`/routes/${routeId}/export_gpx`, {
      headers: this.headers,
      responseType: 'text'
    });
    return response.data;
  }

  async exportRouteTcx(routeId: number): Promise<string> {
    let response = await api.get(`/routes/${routeId}/export_tcx`, {
      headers: this.headers,
      responseType: 'text'
    });
    return response.data;
  }

  async getRouteStreams(routeId: number): Promise<any> {
    let response = await api.get(`/routes/${routeId}/streams`, { headers: this.headers });
    return response.data;
  }

  // ── Clubs ──

  async getClub(clubId: number): Promise<any> {
    let response = await api.get(`/clubs/${clubId}`, { headers: this.headers });
    return response.data;
  }

  async listAthleteClubs(params?: { page?: number; perPage?: number }): Promise<any[]> {
    let response = await api.get('/athlete/clubs', {
      headers: this.headers,
      params: {
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return response.data;
  }

  async listClubMembers(
    clubId: number,
    params?: {
      page?: number;
      perPage?: number;
    }
  ): Promise<any[]> {
    let response = await api.get(`/clubs/${clubId}/members`, {
      headers: this.headers,
      params: {
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return response.data;
  }

  async listClubActivities(
    clubId: number,
    params?: {
      page?: number;
      perPage?: number;
    }
  ): Promise<any[]> {
    let response = await api.get(`/clubs/${clubId}/activities`, {
      headers: this.headers,
      params: {
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return response.data;
  }

  async listClubAdmins(
    clubId: number,
    params?: {
      page?: number;
      perPage?: number;
    }
  ): Promise<any[]> {
    let response = await api.get(`/clubs/${clubId}/admins`, {
      headers: this.headers,
      params: {
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return response.data;
  }

  // ── Gear ──

  async getGear(gearId: string): Promise<any> {
    let response = await api.get(`/gear/${gearId}`, { headers: this.headers });
    return response.data;
  }
}

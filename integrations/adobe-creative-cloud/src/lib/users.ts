import { type AdobeAuthConfig, createAdobeAxios } from './client';

let USERMANAGEMENT_BASE_URL = 'https://usermanagement.adobe.io';

export class UserManagementClient {
  private http;

  constructor(auth: AdobeAuthConfig) {
    this.http = createAdobeAxios(USERMANAGEMENT_BASE_URL, auth);
  }

  async listUsers(orgId: string, page?: number) {
    let response = await this.http.get(`/v2/usermanagement/users/${orgId}/${page || 0}`);
    return response.data;
  }

  async getUser(orgId: string, email: string) {
    let response = await this.http.get(
      `/v2/usermanagement/organizations/${orgId}/users/${email}`
    );
    return response.data;
  }

  async listGroups(orgId: string, page?: number) {
    let response = await this.http.get(`/v2/usermanagement/groups/${orgId}/${page || 0}`);
    return response.data;
  }

  async getGroupMembers(orgId: string, groupName: string, page?: number) {
    let response = await this.http.get(
      `/v2/usermanagement/users/${orgId}/${page || 0}/${encodeURIComponent(groupName)}`
    );
    return response.data;
  }

  async performAction(
    orgId: string,
    actions: Array<{
      user: string;
      requestID?: string;
      do: Array<{
        [actionType: string]: any;
      }>;
    }>
  ) {
    let response = await this.http.post(`/v2/usermanagement/action/${orgId}`, actions);
    return response.data;
  }

  async createUser(
    orgId: string,
    params: {
      email: string;
      firstName: string;
      lastName: string;
      country?: string;
      idType?: 'adobeID' | 'enterpriseID' | 'federatedID';
      productProfiles?: string[];
    }
  ) {
    let doActions: any[] = [];

    let createAction: any = {};
    let idType = params.idType || 'adobeID';

    if (idType === 'adobeID') {
      createAction.addAdobeID = {
        email: params.email,
        country: params.country || 'US',
        firstname: params.firstName,
        lastname: params.lastName
      };
    } else if (idType === 'enterpriseID') {
      createAction.createEnterpriseID = {
        email: params.email,
        country: params.country || 'US',
        firstname: params.firstName,
        lastname: params.lastName
      };
    } else {
      createAction.createFederatedID = {
        email: params.email,
        country: params.country || 'US',
        firstname: params.firstName,
        lastname: params.lastName
      };
    }
    doActions.push(createAction);

    if (params.productProfiles && params.productProfiles.length > 0) {
      for (let profile of params.productProfiles) {
        doActions.push({
          add: {
            product: [profile]
          }
        });
      }
    }

    return this.performAction(orgId, [
      {
        user: params.email,
        do: doActions
      }
    ]);
  }

  async removeUser(orgId: string, email: string) {
    return this.performAction(orgId, [
      {
        user: email,
        do: [
          {
            removeFromOrg: {}
          }
        ]
      }
    ]);
  }

  async addToProductProfile(orgId: string, email: string, productProfiles: string[]) {
    return this.performAction(orgId, [
      {
        user: email,
        do: productProfiles.map(profile => ({
          add: { product: [profile] }
        }))
      }
    ]);
  }

  async removeFromProductProfile(orgId: string, email: string, productProfiles: string[]) {
    return this.performAction(orgId, [
      {
        user: email,
        do: productProfiles.map(profile => ({
          remove: { product: [profile] }
        }))
      }
    ]);
  }
}

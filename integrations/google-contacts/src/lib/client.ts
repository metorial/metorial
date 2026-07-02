import {
  type ContactInput,
  DEFAULT_PERSON_FIELDS,
  READONLY_PERSON_FIELDS
} from '@slates/google-people-recipes';
import axios from 'axios';

let api = axios.create({
  baseURL: 'https://people.googleapis.com/v1/'
});

export class Client {
  private headers: Record<string, string>;

  constructor(config: { token: string }) {
    this.headers = {
      Authorization: `Bearer ${config.token}`
    };
  }

  // ---- People / Contacts ----

  async createContact(contactData: ContactInput) {
    let response = await api.post('people:createContact', contactData, {
      params: { personFields: DEFAULT_PERSON_FIELDS },
      headers: this.headers
    });
    return response.data;
  }

  async updateContact(
    resourceName: string,
    contactData: ContactInput,
    etag: string,
    updatePersonFields: string
  ) {
    let body = {
      ...contactData,
      etag
    };
    let response = await api.patch(`${resourceName}:updateContact`, body, {
      params: {
        updatePersonFields,
        personFields: DEFAULT_PERSON_FIELDS
      },
      headers: this.headers
    });
    return response.data;
  }

  async deleteContact(resourceName: string) {
    await api.delete(`${resourceName}:deleteContact`, {
      headers: this.headers
    });
  }

  async batchGetContacts(resourceNames: string[], personFields?: string) {
    let response = await api.get('people:batchGet', {
      params: {
        resourceNames,
        personFields: personFields || DEFAULT_PERSON_FIELDS
      },
      headers: this.headers
    });
    return response.data;
  }

  async deleteContactPhoto(resourceName: string) {
    let response = await api.delete(`${resourceName}:deleteContactPhoto`, {
      headers: this.headers
    });
    return response.data;
  }

  // ---- Contact Groups ----

  async listContactGroups(pageSize?: number, pageToken?: string) {
    let response = await api.get('contactGroups', {
      params: {
        pageSize: pageSize || 100,
        pageToken,
        groupFields: 'name,groupType,memberCount,clientData'
      },
      headers: this.headers
    });
    return response.data;
  }

  async getContactGroup(resourceName: string, maxMembers?: number) {
    let response = await api.get(resourceName, {
      params: {
        maxMembers: maxMembers || 100,
        groupFields: 'name,groupType,memberCount,clientData'
      },
      headers: this.headers
    });
    return response.data;
  }

  async createContactGroup(name: string, clientData?: Array<{ key: string; value: string }>) {
    let response = await api.post(
      'contactGroups',
      {
        contactGroup: {
          name,
          clientData
        }
      },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async updateContactGroup(
    resourceName: string,
    name: string,
    etag?: string,
    clientData?: Array<{ key: string; value: string }>
  ) {
    let response = await api.put(
      resourceName,
      {
        contactGroup: {
          name,
          etag,
          clientData
        }
      },
      {
        params: {
          updateGroupFields: 'name,clientData'
        },
        headers: this.headers
      }
    );
    return response.data;
  }

  async deleteContactGroup(resourceName: string, deleteContacts?: boolean) {
    await api.delete(resourceName, {
      params: { deleteContacts: deleteContacts || false },
      headers: this.headers
    });
  }

  async modifyContactGroupMembers(
    resourceName: string,
    addResourceNames?: string[],
    removeResourceNames?: string[]
  ) {
    let response = await api.post(
      `${resourceName}/members:modify`,
      {
        resourceNamesToAdd: addResourceNames,
        resourceNamesToRemove: removeResourceNames
      },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  // ---- Other Contacts ----

  async listOtherContacts(pageSize?: number, pageToken?: string) {
    let response = await api.get('otherContacts', {
      params: {
        pageSize: pageSize || 100,
        pageToken,
        readMask: READONLY_PERSON_FIELDS
      },
      headers: this.headers
    });
    return response.data;
  }

  async searchOtherContacts(query: string, pageSize?: number) {
    let response = await api.get('otherContacts:search', {
      params: {
        query,
        readMask: READONLY_PERSON_FIELDS,
        pageSize: pageSize || 30
      },
      headers: this.headers
    });
    return response.data;
  }

  async copyOtherContactToMyContacts(resourceName: string) {
    let response = await api.post(
      `${resourceName}:copyOtherContactToMyContactsGroup`,
      {
        copyMask: READONLY_PERSON_FIELDS,
        readMask: DEFAULT_PERSON_FIELDS
      },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  // ---- Directory ----

  async listDirectoryPeople(params: {
    pageSize?: number;
    pageToken?: string;
    sources: string[];
    readMask?: string;
  }) {
    let searchParams = new URLSearchParams();
    searchParams.set('pageSize', String(params.pageSize || 100));
    if (params.pageToken) {
      searchParams.set('pageToken', params.pageToken);
    }
    for (let source of params.sources) {
      searchParams.append('sources', source);
    }
    searchParams.set('readMask', params.readMask || DEFAULT_PERSON_FIELDS);

    let response = await api.get('people:listDirectoryPeople', {
      params: searchParams,
      headers: this.headers
    });
    return response.data;
  }

  async searchDirectoryPeople(params: {
    query: string;
    pageSize?: number;
    pageToken?: string;
    sources: string[];
    readMask?: string;
  }) {
    let searchParams = new URLSearchParams();
    searchParams.set('query', params.query);
    searchParams.set('pageSize', String(params.pageSize || 30));
    if (params.pageToken) {
      searchParams.set('pageToken', params.pageToken);
    }
    for (let source of params.sources) {
      searchParams.append('sources', source);
    }
    searchParams.set('readMask', params.readMask || DEFAULT_PERSON_FIELDS);

    let response = await api.get('people:searchDirectoryPeople', {
      params: searchParams,
      headers: this.headers
    });
    return response.data;
  }
}

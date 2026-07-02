import { createAxios } from 'slates';

export class Client {
  private http: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.http = createAxios({
      baseURL: 'https://enterprise.godial.cc/meta/api/externals',
      params: { access_token: config.token }
    });
  }

  // Lists

  async getLists(): Promise<any[]> {
    let response = await this.http.get('/lists/list');
    return response.data;
  }

  // Contacts

  async getContacts(listId: string): Promise<any[]> {
    let response = await this.http.get(`/contact/list/${listId}`);
    return response.data;
  }

  async addContact(data: {
    listId: string;
    phone: string;
    name?: string;
    email?: string;
    secondPhone?: string;
    companyName?: string;
    note?: string;
    remarks?: string;
    extra?: string;
    assignmentMode?: string;
  }): Promise<any> {
    let response = await this.http.post('/contact/add', data);
    return response.data;
  }

  // Accounts (Members/Agents)

  async listAccounts(): Promise<any[]> {
    let response = await this.http.get('/accounts/list');
    return response.data;
  }

  async addMember(data: {
    teamsId: string[];
    name: string;
    email?: string;
    username: string;
    password: string;
    role: string;
  }): Promise<any> {
    let response = await this.http.post('/accounts/add', data);
    return response.data;
  }

  async removeAccount(accountId: string): Promise<any> {
    let response = await this.http.post('/accounts/remove', { id: accountId });
    return response.data;
  }

  // Teams

  async getTeams(): Promise<any[]> {
    let response = await this.http.get('/team/list');
    return response.data;
  }
}

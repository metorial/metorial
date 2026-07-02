import { createAxios } from 'slates';

export interface MemberVaultProduct {
  courseId: string;
  courseName: string;
  coursePrice: string;
  courseUrl: string;
  courseStatus: string;
  [key: string]: unknown;
}

export interface AddUserParams {
  email: string;
  firstName?: string;
  lastName?: string;
  productId: string;
}

export interface RemoveUserParams {
  email: string;
  productId: string;
}

export interface DeleteUserParams {
  email: string;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;
  private token: string;

  constructor(config: { token: string; subdomain: string }) {
    this.token = config.token;
    this.axios = createAxios({
      baseURL: `https://${config.subdomain}.mvsite.app/api`
    });
  }

  async listProducts(): Promise<MemberVaultProduct[]> {
    let response = await this.axios.get('/courses', {
      params: {
        apikey: this.token
      }
    });
    return response.data;
  }

  async addUserToProduct(params: AddUserParams): Promise<unknown> {
    let queryParams: Record<string, string> = {
      apikey: this.token,
      email: params.email,
      course_id: params.productId
    };

    if (params.firstName) {
      queryParams.first_name = params.firstName;
    }
    if (params.lastName) {
      queryParams.last_name = params.lastName;
    }

    let response = await this.axios.get('/adduser', {
      params: queryParams
    });
    return response.data;
  }

  async removeUserFromProduct(params: RemoveUserParams): Promise<unknown> {
    let response = await this.axios.get('/removeuser', {
      params: {
        apikey: this.token,
        email: params.email,
        course_id: params.productId
      }
    });
    return response.data;
  }

  async deleteUser(params: DeleteUserParams): Promise<unknown> {
    let response = await this.axios.get('/deleteuser', {
      params: {
        apikey: this.token,
        email: params.email
      }
    });
    return response.data;
  }
}

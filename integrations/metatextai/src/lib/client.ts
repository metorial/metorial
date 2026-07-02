import { createAxios } from 'slates';

let axiosInstance = createAxios({
  baseURL: 'https://api.metatext.ai'
});

export class Client {
  constructor(private token: string) {}

  private get headers() {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.token
    };
  }

  async analyzeSentiment(text: string) {
    let response = await axiosInstance.post(
      '/hub-inference/sentiment-analysis',
      { text },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async extractKeywords(text: string) {
    let response = await axiosInstance.post(
      '/hub-inference/keyword-extractor',
      { text },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async generateBlogPost(text: string) {
    let response = await axiosInstance.post(
      '/hub-inference/blog-post-generation',
      { text },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async generateText(text: string) {
    let response = await axiosInstance.post(
      '/hub-inference/text-generator',
      { text },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async generateHeadline(text: string) {
    let response = await axiosInstance.post(
      '/hub-inference/headline',
      { text },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async detectSpam(text: string) {
    let response = await axiosInstance.post(
      '/hub-inference/spam-or-not',
      { text },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async runCustomModelInference(modelId: string, text: string) {
    let response = await axiosInstance.post(
      `/v1/inference/${modelId}`,
      { text },
      {
        headers: this.headers
      }
    );
    return response.data;
  }
}

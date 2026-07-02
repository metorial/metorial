import { createAxios } from 'slates';

export class ExecutionClient {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  async executeCode(params: {
    code: string;
    input?: string;
    returnBinary?: boolean;
    origin?: string;
  }): Promise<any> {
    let client = createAxios({
      baseURL: 'https://e.customjs.io'
    });

    let response = await client.post(
      `/__js1-${this.token}`,
      {
        code: params.code,
        input: params.input || '',
        returnBinary: params.returnBinary ? 'true' : 'false'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'customjs-origin': params.origin || 'slates/execute'
        }
      }
    );

    return response.data;
  }

  async htmlToPdf(params: {
    html: string;
    templateData?: Record<string, any>;
    widthMm?: number;
    heightMm?: number;
  }): Promise<any> {
    let client = createAxios({
      baseURL: 'https://e.customjs.io'
    });

    let body: Record<string, any> = {
      html: params.html
    };

    if (params.templateData) {
      body.data = params.templateData;
    }

    if (params.widthMm || params.heightMm) {
      body.config = {};
      if (params.widthMm) body.config.pdfWidthMm = params.widthMm;
      if (params.heightMm) body.config.pdfHeightMm = params.heightMm;
    }

    let response = await client.post('/html2pdf', body, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.token
      },
      responseType: 'arraybuffer'
    });

    return Buffer.from(response.data).toString('base64');
  }

  async markdownToPdf(params: { markdown: string }): Promise<string> {
    let client = createAxios({
      baseURL: 'https://e.customjs.io'
    });

    let response = await client.post(
      '/markdown2pdf',
      {
        markdown: params.markdown
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.token
        },
        responseType: 'arraybuffer'
      }
    );

    return Buffer.from(response.data).toString('base64');
  }

  async screenshot(params: {
    url: string;
    commands?: Array<{ action: string; selector?: string; value?: string | number }>;
    box?: { x: number; y: number; width: number; height: number };
  }): Promise<string> {
    let client = createAxios({
      baseURL: 'https://e.customjs.io'
    });

    let body: Record<string, any> = {
      url: params.url
    };

    if (params.commands && params.commands.length > 0) {
      body.commands = params.commands;
    }

    if (params.box) {
      body.box = params.box;
    }

    let response = await client.post('/screenshot', body, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.token
      },
      responseType: 'arraybuffer'
    });

    return Buffer.from(response.data).toString('base64');
  }

  async scrape(params: {
    url: string;
    commands?: Array<{ action: string; selector?: string; value?: string | number }>;
  }): Promise<string> {
    let client = createAxios({
      baseURL: 'https://e.customjs.io'
    });

    let body: Record<string, any> = {
      url: params.url
    };

    if (params.commands && params.commands.length > 0) {
      body.commands = params.commands;
    }

    let response = await client.post('/scraper', body, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.token
      }
    });

    return response.data;
  }

  async mergePdfs(params: { urls: string[] }): Promise<string> {
    let code = `
const { PDF_MERGE } = require('./utils');
const axios = require('axios');
let urls = JSON.parse(input);
let buffers = await Promise.all(urls.map(url => axios.get(url, { responseType: 'arraybuffer' }).then(r => r.data)));
return PDF_MERGE(buffers);
    `.trim();

    let client = createAxios({
      baseURL: 'https://e.customjs.io'
    });

    let response = await client.post(
      `/__js1-${this.token}`,
      {
        code,
        input: JSON.stringify(params.urls),
        returnBinary: 'true'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'customjs-origin': 'slates/mergePdfs'
        },
        responseType: 'arraybuffer'
      }
    );

    return Buffer.from(response.data).toString('base64');
  }

  async extractPdfPages(params: { pdfUrl: string; pageRange: string }): Promise<string> {
    let code = `
const { EXTRACT_PAGES_FROM_PDF } = require('./utils');
const axios = require('axios');
let parsed = JSON.parse(input);
let resp = await axios.get(parsed.url, { responseType: 'arraybuffer' });
return EXTRACT_PAGES_FROM_PDF(resp.data, parsed.pageRange);
    `.trim();

    let client = createAxios({
      baseURL: 'https://e.customjs.io'
    });

    let response = await client.post(
      `/__js1-${this.token}`,
      {
        code,
        input: JSON.stringify({ url: params.pdfUrl, pageRange: params.pageRange }),
        returnBinary: 'true'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'customjs-origin': 'slates/extractPdfPages'
        },
        responseType: 'arraybuffer'
      }
    );

    return Buffer.from(response.data).toString('base64');
  }

  async compressPdf(params: { pdfUrl: string }): Promise<string> {
    let code = `
const { PDF_COMPRESS } = require('./utils');
const axios = require('axios');
let resp = await axios.get(input, { responseType: 'arraybuffer' });
return PDF_COMPRESS(resp.data);
    `.trim();

    let client = createAxios({
      baseURL: 'https://e.customjs.io'
    });

    let response = await client.post(
      `/__js1-${this.token}`,
      {
        code,
        input: params.pdfUrl,
        returnBinary: 'true'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'customjs-origin': 'slates/compressPdf'
        },
        responseType: 'arraybuffer'
      }
    );

    return Buffer.from(response.data).toString('base64');
  }

  async pdfToText(params: { pdfUrl: string }): Promise<string> {
    let code = `
const { PDFTOTEXT } = require('./utils');
const axios = require('axios');
let resp = await axios.get(input, { responseType: 'arraybuffer' });
return PDFTOTEXT(resp.data);
    `.trim();

    let client = createAxios({
      baseURL: 'https://e.customjs.io'
    });

    let response = await client.post(
      `/__js1-${this.token}`,
      {
        code,
        input: params.pdfUrl,
        returnBinary: 'false'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'customjs-origin': 'slates/pdfToText'
        }
      }
    );

    return response.data;
  }

  async pdfToPng(params: { pdfUrl: string }): Promise<string> {
    let code = `
const { PDF2PNG } = require('./utils');
const axios = require('axios');
let resp = await axios.get(input, { responseType: 'arraybuffer' });
return PDF2PNG(resp.data);
    `.trim();

    let client = createAxios({
      baseURL: 'https://e.customjs.io'
    });

    let response = await client.post(
      `/__js1-${this.token}`,
      {
        code,
        input: params.pdfUrl,
        returnBinary: 'true'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'customjs-origin': 'slates/pdfToPng'
        },
        responseType: 'arraybuffer'
      }
    );

    return Buffer.from(response.data).toString('base64');
  }

  async readPdfFormFields(params: { pdfUrl: string }): Promise<any> {
    let code = `
const { PDF_GET_FORM_FIELD_NAMES } = require('./utils');
const axios = require('axios');
let resp = await axios.get(input, { responseType: 'arraybuffer' });
return PDF_GET_FORM_FIELD_NAMES(resp.data);
    `.trim();

    let client = createAxios({
      baseURL: 'https://e.customjs.io'
    });

    let response = await client.post(
      `/__js1-${this.token}`,
      {
        code,
        input: params.pdfUrl,
        returnBinary: 'false'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'customjs-origin': 'slates/readPdfFormFields'
        }
      }
    );

    return response.data;
  }

  async fillPdfForm(params: {
    pdfUrl: string;
    fields: Record<string, string>;
  }): Promise<string> {
    let code = `
const { PDF_FILL_FORM } = require('./utils');
const axios = require('axios');
let parsed = JSON.parse(input);
let resp = await axios.get(parsed.url, { responseType: 'arraybuffer' });
return PDF_FILL_FORM(resp.data, parsed.fields);
    `.trim();

    let client = createAxios({
      baseURL: 'https://e.customjs.io'
    });

    let response = await client.post(
      `/__js1-${this.token}`,
      {
        code,
        input: JSON.stringify({ url: params.pdfUrl, fields: params.fields }),
        returnBinary: 'true'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'customjs-origin': 'slates/fillPdfForm'
        },
        responseType: 'arraybuffer'
      }
    );

    return Buffer.from(response.data).toString('base64');
  }

  async htmlToPng(params: { html: string }): Promise<string> {
    let code = `
const { HTML2PNG } = require('./utils');
return HTML2PNG(input);
    `.trim();

    let client = createAxios({
      baseURL: 'https://e.customjs.io'
    });

    let response = await client.post(
      `/__js1-${this.token}`,
      {
        code,
        input: params.html,
        returnBinary: 'true'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'customjs-origin': 'slates/htmlToPng'
        },
        responseType: 'arraybuffer'
      }
    );

    return Buffer.from(response.data).toString('base64');
  }

  async htmlToDocx(params: { html: string }): Promise<string> {
    let code = `
const { HTML2DOCX } = require('./utils');
return HTML2DOCX(input);
    `.trim();

    let client = createAxios({
      baseURL: 'https://e.customjs.io'
    });

    let response = await client.post(
      `/__js1-${this.token}`,
      {
        code,
        input: params.html,
        returnBinary: 'true'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'customjs-origin': 'slates/htmlToDocx'
        },
        responseType: 'arraybuffer'
      }
    );

    return Buffer.from(response.data).toString('base64');
  }

  async markdownToHtml(params: { markdown: string }): Promise<string> {
    let code = `
const { MD2HTML } = require('./utils');
return MD2HTML(input);
    `.trim();

    let client = createAxios({
      baseURL: 'https://e.customjs.io'
    });

    let response = await client.post(
      `/__js1-${this.token}`,
      {
        code,
        input: params.markdown,
        returnBinary: 'false'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'customjs-origin': 'slates/markdownToHtml'
        }
      }
    );

    return response.data;
  }

  async sslCheck(params: { domain: string }): Promise<any> {
    let code = `
const checkCertExpiration = require('check-cert-expiration');
return checkCertExpiration(input);
    `.trim();

    let client = createAxios({
      baseURL: 'https://e.customjs.io'
    });

    let response = await client.post(
      `/__js1-${this.token}`,
      {
        code,
        input: params.domain,
        returnBinary: 'false'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'customjs-origin': 'slates/sslCheck'
        }
      }
    );

    return response.data;
  }

  async jsonPathQuery(params: { json: string; path: string }): Promise<any> {
    let code = `
const { JSONPath } = require('jsonpath-plus');
let parsed = JSON.parse(input);
return JSONPath({ path: parsed.path, json: JSON.parse(parsed.json) });
    `.trim();

    let client = createAxios({
      baseURL: 'https://e.customjs.io'
    });

    let response = await client.post(
      `/__js1-${this.token}`,
      {
        code,
        input: JSON.stringify({ json: params.json, path: params.path }),
        returnBinary: 'false'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'customjs-origin': 'slates/jsonPath'
        }
      }
    );

    return response.data;
  }

  async regexOperation(params: {
    text: string;
    pattern: string;
    flags?: string;
    operation: 'Extract' | 'Replace' | 'Test' | 'Split';
    replacement?: string;
  }): Promise<any> {
    let code = `
let parsed = JSON.parse(input);
let regex = new RegExp(parsed.pattern, parsed.flags || '');
let text = parsed.text;
switch (parsed.operation) {
  case 'Extract': {
    let matches = [];
    if (parsed.flags && parsed.flags.includes('g')) {
      let m;
      while ((m = regex.exec(text)) !== null) { matches.push(m[0]); }
    } else {
      let m = regex.exec(text);
      if (m) matches.push(m[0]);
    }
    return matches;
  }
  case 'Replace':
    return text.replace(regex, parsed.replacement || '');
  case 'Test':
    return regex.test(text);
  case 'Split':
    return text.split(regex);
  default:
    return null;
}
    `.trim();

    let client = createAxios({
      baseURL: 'https://e.customjs.io'
    });

    let response = await client.post(
      `/__js1-${this.token}`,
      {
        code,
        input: JSON.stringify({
          text: params.text,
          pattern: params.pattern,
          flags: params.flags || '',
          operation: params.operation,
          replacement: params.replacement || ''
        }),
        returnBinary: 'false'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'customjs-origin': 'slates/regex'
        }
      }
    );

    return response.data;
  }
}

export class PagesClient {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private getClient() {
    return createAxios({
      baseURL: 'https://api.app.customjs.io',
      headers: {
        'x-api-key': this.token,
        'Content-Type': 'application/json'
      }
    });
  }

  async upsertPage(params: { name: string; htmlContent: string; slug?: string }): Promise<{
    pageId: string;
    htmlFileUrl: string;
    name: string;
    message: string;
    created: boolean;
  }> {
    let client = this.getClient();

    let body: Record<string, any> = {
      name: params.name,
      htmlContent: params.htmlContent
    };

    if (params.slug) {
      body.slug = params.slug;
    }

    let response = await client.post('/pages/page/upsert-html', body);
    return response.data;
  }

  async listPages(): Promise<any[]> {
    let client = this.getClient();
    let response = await client.get('/pages/api/page');
    return response.data;
  }

  async getPage(pageId: string): Promise<any> {
    let client = this.getClient();
    let response = await client.get(`/pages/api/page/id/${pageId}`);
    return response.data;
  }

  async deletePage(pageId: string): Promise<void> {
    let client = this.getClient();
    await client.delete(`/pages/api/page/id/${pageId}`);
  }
}

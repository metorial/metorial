import { metorial, ResourceTemplate, z } from '@metorial/mcp-server-sdk';

/**
 * Arxiv MCP Server
 * Provides tools and resources for searching and retrieving academic papers from Arxiv
 */

metorial.createServer<{}>(
  {
    name: 'arxiv-server',
    version: '1.0.0'
  },
  (server, args) => {
    // ============================================================================
    // Types and Interfaces
    // ============================================================================

    interface ArxivEntry {
      id: string;
      updated: string;
      published: string;
      title: string;
      summary: string;
      authors: string[];
      categories: string[];
      links: { href: string; title?: string; rel?: string; type?: string }[];
      doi?: string;
      journalRef?: string;
      comment?: string;
    }

    interface ArxivCategory {
      code: string;
      name: string;
      description: string;
    }

    // ============================================================================
    // Helper Functions
    // ============================================================================

    /**
     * Parse XML response from Arxiv API
     */
    function parseArxivXML(xmlText: string): ArxivEntry[] {
      const entries: ArxivEntry[] = [];

      // Extract entries using regex (simple XML parsing for Deno environment)
      const entryMatches = xmlText.matchAll(/<entry>(.*?)<\/entry>/gs);

      for (const match of entryMatches) {
        const entryXml = match[1] as any;

        // Extract ID
        const idMatch = entryXml.match(/<id>(.*?)<\/id>/);
        const id = idMatch ? idMatch[1].trim() : '';

        // Extract updated date
        const updatedMatch = entryXml.match(/<updated>(.*?)<\/updated>/);
        const updated = updatedMatch ? updatedMatch[1].trim() : '';

        // Extract published date
        const publishedMatch = entryXml.match(/<published>(.*?)<\/published>/);
        const published = publishedMatch ? publishedMatch[1].trim() : '';

        // Extract title
        const titleMatch = entryXml.match(/<title>(.*?)<\/title>/s);
        const title = titleMatch ? titleMatch[1].trim().replace(/\s+/g, ' ') : '';

        // Extract summary
        const summaryMatch = entryXml.match(/<summary>(.*?)<\/summary>/s);
        const summary = summaryMatch ? summaryMatch[1].trim().replace(/\s+/g, ' ') : '';

        // Extract authors
        const authors: string[] = [];
        const authorMatches = entryXml.matchAll(
          /<author>.*?<name>(.*?)<\/name>.*?<\/author>/gs
        );
        for (const authorMatch of authorMatches) {
          authors.push(authorMatch[1].trim());
        }

        // Extract categories
        const categories: string[] = [];
        const categoryMatches = entryXml.matchAll(/<category\s+term="(.*?)"\s*\/>/g);
        for (const categoryMatch of categoryMatches) {
          categories.push(categoryMatch[1].trim());
        }

        // Extract links
        const links: { href: string; title?: string; rel?: string; type?: string }[] = [];
        const linkMatches = entryXml.matchAll(/<link\s+(.*?)\/>/g);
        for (const linkMatch of linkMatches) {
          const linkAttrs = linkMatch[1];
          const hrefMatch = linkAttrs.match(/href="(.*?)"/);
          const titleMatch = linkAttrs.match(/title="(.*?)"/);
          const relMatch = linkAttrs.match(/rel="(.*?)"/);
          const typeMatch = linkAttrs.match(/type="(.*?)"/);

          if (hrefMatch) {
            links.push({
              href: hrefMatch[1],
              title: titleMatch?.[1],
              rel: relMatch?.[1],
              type: typeMatch?.[1]
            });
          }
        }

        // Extract DOI
        const doiMatch = entryXml.match(/<arxiv:doi.*?>(.*?)<\/arxiv:doi>/s);
        const doi = doiMatch ? doiMatch[1].trim() : undefined;

        // Extract journal reference
        const journalMatch = entryXml.match(
          /<arxiv:journal_ref.*?>(.*?)<\/arxiv:journal_ref>/s
        );
        const journalRef = journalMatch ? journalMatch[1].trim() : undefined;

        // Extract comment
        const commentMatch = entryXml.match(/<arxiv:comment.*?>(.*?)<\/arxiv:comment>/s);
        const comment = commentMatch ? commentMatch[1].trim() : undefined;

        entries.push({
          id,
          updated,
          published,
          title,
          summary,
          authors,
          categories,
          links,
          doi,
          journalRef,
          comment
        });
      }

      return entries;
    }

    /**
     * Extract Arxiv ID from various formats
     */
    function extractArxivId(input: string): string {
      // Remove common prefixes
      let id = input.replace(/^(https?:\/\/arxiv\.org\/(abs|pdf)\/|arxiv:|arXiv:)/i, '');

      // Remove .pdf suffix if present
      id = id.replace(/\.pdf$/i, '');

      return id.trim();
    }

    /**
     * Format paper entry for display
     */
    function formatPaperEntry(entry: ArxivEntry, includeAbstract: boolean = false): string {
      const arxivId = extractArxivId(entry.id);
      let output = `**${entry.title}**\n`;
      output += `Arxiv ID: ${arxivId}\n`;
      output += `Authors: ${entry.authors.join(', ')}\n`;
      output += `Published: ${entry.published.split('T')[0]}\n`;
      output += `Updated: ${entry.updated.split('T')[0]}\n`;
      output += `Categories: ${entry.categories.join(', ')}\n`;

      if (entry.doi) {
        output += `DOI: ${entry.doi}\n`;
      }

      if (entry.journalRef) {
        output += `Journal: ${entry.journalRef}\n`;
      }

      if (entry.comment) {
        output += `Comment: ${entry.comment}\n`;
      }

      // Add links
      const pdfLink = entry.links.find(l => l.title === 'pdf');
      const absLink = entry.links.find(l => l.rel === 'alternate');

      if (absLink) {
        output += `URL: ${absLink.href}\n`;
      }

      if (pdfLink) {
        output += `PDF: ${pdfLink.href}\n`;
      }

      if (includeAbstract) {
        output += `\nAbstract:\n${entry.summary}\n`;
      }

      return output;
    }

    /**
     * Query Arxiv API
     */
    async function queryArxiv(params: {
      search_query?: string;
      id_list?: string;
      start?: number;
      max_results?: number;
      sortBy?: string;
      sortOrder?: string;
    }): Promise<ArxivEntry[]> {
      const baseUrl = 'https://export.arxiv.org/api/query';
      const queryParams = new URLSearchParams();

      if (params.search_query) {
        queryParams.append('search_query', params.search_query);
      }

      if (params.id_list) {
        queryParams.append('id_list', params.id_list);
      }

      if (params.start !== undefined) {
        queryParams.append('start', String(params.start));
      }

      if (params.max_results !== undefined) {
        queryParams.append('max_results', String(params.max_results));
      }

      if (params.sortBy) {
        queryParams.append('sortBy', params.sortBy);
      }

      if (params.sortOrder) {
        queryParams.append('sortOrder', params.sortOrder);
      }

      const url = `${baseUrl}?${queryParams.toString()}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Arxiv API error: ${response.status} ${response.statusText}`);
      }

      const xmlText = await response.text();
      return parseArxivXML(xmlText);
    }

    /**
     * Get major Arxiv categories
     */
    function getArxivCategories(): ArxivCategory[] {
      return [
        // Computer Science
        {
          code: 'cs.AI',
          name: 'Artificial Intelligence',
          description: 'AI, machine learning, natural language processing'
        },
        {
          code: 'cs.CL',
          name: 'Computation and Language',
          description: 'Natural language processing, computational linguistics'
        },
        {
          code: 'cs.CV',
          name: 'Computer Vision',
          description: 'Image processing, computer vision, pattern recognition'
        },
        {
          code: 'cs.LG',
          name: 'Machine Learning',
          description: 'Machine learning algorithms and theory'
        },
        {
          code: 'cs.NE',
          name: 'Neural and Evolutionary Computing',
          description: 'Neural networks, genetic algorithms'
        },
        { code: 'cs.RO', name: 'Robotics', description: 'Robotics, autonomous systems' },
        {
          code: 'cs.CR',
          name: 'Cryptography and Security',
          description: 'Cryptography, network security, privacy'
        },
        {
          code: 'cs.DS',
          name: 'Data Structures and Algorithms',
          description: 'Algorithms, data structures, complexity theory'
        },
        { code: 'cs.DB', name: 'Databases', description: 'Database systems, data management' },
        {
          code: 'cs.DC',
          name: 'Distributed Computing',
          description: 'Distributed systems, parallel computing'
        },
        {
          code: 'cs.SE',
          name: 'Software Engineering',
          description: 'Software development, testing, maintenance'
        },

        // Mathematics
        {
          code: 'math.AG',
          name: 'Algebraic Geometry',
          description: 'Algebraic geometry and related topics'
        },
        { code: 'math.CO', name: 'Combinatorics', description: 'Combinatorics, graph theory' },
        {
          code: 'math.NT',
          name: 'Number Theory',
          description: 'Number theory and arithmetic'
        },
        {
          code: 'math.PR',
          name: 'Probability',
          description: 'Probability theory and stochastic processes'
        },
        {
          code: 'math.ST',
          name: 'Statistics',
          description: 'Statistics and statistical theory'
        },
        {
          code: 'math.OC',
          name: 'Optimization and Control',
          description: 'Optimization, control theory'
        },

        // Physics
        {
          code: 'physics.comp-ph',
          name: 'Computational Physics',
          description: 'Computational methods in physics'
        },
        {
          code: 'physics.data-an',
          name: 'Data Analysis',
          description: 'Data analysis in physics'
        },
        {
          code: 'quant-ph',
          name: 'Quantum Physics',
          description: 'Quantum mechanics and quantum information'
        },
        {
          code: 'hep-th',
          name: 'High Energy Physics - Theory',
          description: 'Theoretical high energy physics'
        },
        { code: 'astro-ph', name: 'Astrophysics', description: 'Astrophysics and cosmology' },

        // Statistics
        {
          code: 'stat.ML',
          name: 'Machine Learning (Statistics)',
          description: 'Machine learning from statistics perspective'
        },
        { code: 'stat.ME', name: 'Methodology', description: 'Statistical methodology' },
        { code: 'stat.TH', name: 'Statistics Theory', description: 'Statistical theory' },

        // Quantitative fields
        {
          code: 'q-bio',
          name: 'Quantitative Biology',
          description: 'Quantitative methods in biology'
        },
        {
          code: 'q-fin',
          name: 'Quantitative Finance',
          description: 'Quantitative finance and economics'
        },

        // Electrical Engineering
        {
          code: 'eess.IV',
          name: 'Image and Video Processing',
          description: 'Image and video processing'
        },
        { code: 'eess.SP', name: 'Signal Processing', description: 'Signal processing' },
        {
          code: 'eess.SY',
          name: 'Systems and Control',
          description: 'Control systems and signal processing'
        }
      ];
    }

    // ============================================================================
    // Tools
    // ============================================================================

    /**
     * Search for papers using general query
     */
    server.registerTool(
      'search_papers',
      {
        title: 'Search Papers',
        description:
          'Search for academic papers on Arxiv using a general query. Supports Boolean operators (AND, OR, ANDNOT) and field-specific searches (ti: for title, au: for author, abs: for abstract, cat: for category).',
        inputSchema: {
          query: z
            .string()
            .describe(
              'Search query string. Examples: "machine learning", "ti:transformer AND cat:cs.LG", "au:Hinton"'
            ),
          max_results: z
            .number()
            .optional()
            .default(10)
            .describe('Maximum number of results to return (default: 10)'),
          sort_by: z
            .enum(['relevance', 'lastUpdatedDate', 'submittedDate'])
            .optional()
            .default('relevance')
            .describe('Sort order (default: relevance)'),
          sort_order: z
            .enum(['ascending', 'descending'])
            .optional()
            .default('descending')
            .describe('Sort direction (default: descending)'),
          start: z
            .number()
            .optional()
            .default(0)
            .describe('Starting index for pagination (default: 0)')
        }
      },
      async ({ query, max_results, sort_by, sort_order, start }) => {
        try {
          const entries = await queryArxiv({
            search_query: `all:${query}`,
            max_results,
            sortBy: sort_by,
            sortOrder: sort_order,
            start
          });

          if (entries.length === 0) {
            return {
              content: [{ type: 'text', text: 'No papers found matching your query.' }]
            };
          }

          let output = `Found ${entries.length} papers:\n\n`;
          entries.forEach((entry, index) => {
            output += `${index + 1}. ${formatPaperEntry(entry, false)}\n`;
          });

          return {
            content: [{ type: 'text', text: output }]
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error searching papers: ${
                  error instanceof Error ? error.message : String(error)
                }`
              }
            ],
            isError: true
          };
        }
      }
    );

    /**
     * Search papers by author
     */
    server.registerTool(
      'search_papers_by_author',
      {
        title: 'Search Papers by Author',
        description: 'Search for papers by a specific author name.',
        inputSchema: {
          author: z.string().describe('Author name (e.g., "Geoffrey Hinton", "Yann LeCun")'),
          max_results: z
            .number()
            .optional()
            .default(10)
            .describe('Maximum number of results to return (default: 10)'),
          start: z
            .number()
            .optional()
            .default(0)
            .describe('Starting index for pagination (default: 0)')
        }
      },
      async ({ author, max_results, start }) => {
        try {
          const entries = await queryArxiv({
            search_query: `au:${author}`,
            max_results,
            sortBy: 'submittedDate',
            sortOrder: 'descending',
            start
          });

          if (entries.length === 0) {
            return {
              content: [{ type: 'text', text: `No papers found by author "${author}".` }]
            };
          }

          let output = `Found ${entries.length} papers by ${author}:\n\n`;
          entries.forEach((entry, index) => {
            output += `${index + 1}. ${formatPaperEntry(entry, false)}\n`;
          });

          return {
            content: [{ type: 'text', text: output }]
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error searching papers by author: ${
                  error instanceof Error ? error.message : String(error)
                }`
              }
            ],
            isError: true
          };
        }
      }
    );

    /**
     * Search papers by category
     */
    server.registerTool(
      'search_papers_by_category',
      {
        title: 'Search Papers by Category',
        description: 'Search for papers in a specific Arxiv category.',
        inputSchema: {
          category: z
            .string()
            .describe(
              'Arxiv category code (e.g., "cs.AI", "cs.LG", "math.CO"). Use get_categories tool to see available categories.'
            ),
          max_results: z
            .number()
            .optional()
            .default(10)
            .describe('Maximum number of results to return (default: 10)'),
          start: z
            .number()
            .optional()
            .default(0)
            .describe('Starting index for pagination (default: 0)')
        }
      },
      async ({ category, max_results, start }) => {
        try {
          const entries = await queryArxiv({
            search_query: `cat:${category}`,
            max_results,
            sortBy: 'submittedDate',
            sortOrder: 'descending',
            start
          });

          if (entries.length === 0) {
            return {
              content: [{ type: 'text', text: `No papers found in category "${category}".` }]
            };
          }

          let output = `Found ${entries.length} papers in category ${category}:\n\n`;
          entries.forEach((entry, index) => {
            output += `${index + 1}. ${formatPaperEntry(entry, false)}\n`;
          });

          return {
            content: [{ type: 'text', text: output }]
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error searching papers by category: ${
                  error instanceof Error ? error.message : String(error)
                }`
              }
            ],
            isError: true
          };
        }
      }
    );

    /**
     * Get list of available Arxiv categories
     */
    server.registerTool(
      'get_categories',
      {
        title: 'Get Categories',
        description: 'Get a list of available Arxiv category codes and their descriptions.',
        inputSchema: {}
      },
      async () => {
        try {
          const categories = getArxivCategories();

          let output = 'Available Arxiv Categories:\n\n';

          // Group by main subject
          const grouped: { [key: string]: ArxivCategory[] } = {};
          categories.forEach(cat => {
            const mainSubject = cat.code.split('.')[0] as string;
            if (!grouped[mainSubject]) {
              grouped[mainSubject] = [];
            }
            grouped[mainSubject].push(cat);
          });

          for (const [subject, cats] of Object.entries(grouped)) {
            output += `\n**${subject.toUpperCase()}**\n`;
            cats.forEach(cat => {
              output += `- ${cat.code}: ${cat.name} - ${cat.description}\n`;
            });
          }

          return {
            content: [{ type: 'text', text: output }]
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error getting categories: ${
                  error instanceof Error ? error.message : String(error)
                }`
              }
            ],
            isError: true
          };
        }
      }
    );

    // ============================================================================
    // Resources
    // ============================================================================

    /**
     * Get full paper details by Arxiv ID
     */
    server.registerResource(
      'paper',
      new ResourceTemplate('arxiv://paper/{arxiv_id}', { list: undefined }),
      {
        title: 'Paper Details',
        description:
          'Retrieve detailed information about a specific paper by its Arxiv ID (e.g., arxiv://paper/2301.07041 or arxiv://paper/1706.03762v7)'
      },
      async (uri, { arxiv_id }) => {
        try {
          const cleanId = extractArxivId(arxiv_id as string);
          const entries = await queryArxiv({
            id_list: cleanId,
            max_results: 1
          });

          if (entries.length === 0) {
            return {
              contents: [
                {
                  uri: uri.href,
                  text: `Paper with ID "${arxiv_id}" not found.`,
                  mimeType: 'text/plain'
                }
              ]
            };
          }

          const entry = entries[0] as any;
          const output = formatPaperEntry(entry, true);

          return {
            contents: [
              {
                uri: uri.href,
                text: output,
                mimeType: 'text/plain'
              }
            ]
          };
        } catch (error) {
          return {
            contents: [
              {
                uri: uri.href,
                text: `Error retrieving paper: ${
                  error instanceof Error ? error.message : String(error)
                }`,
                mimeType: 'text/plain'
              }
            ]
          };
        }
      }
    );

    /**
     * Get paper abstract only
     */
    server.registerResource(
      'paper_abstract',
      new ResourceTemplate('arxiv://paper/{arxiv_id}/abstract', { list: undefined }),
      {
        title: 'Paper Abstract',
        description:
          'Retrieve only the abstract of a specific paper by its Arxiv ID (e.g., arxiv://paper/2301.07041/abstract)'
      },
      async (uri, { arxiv_id }) => {
        try {
          const cleanId = extractArxivId(arxiv_id as string);
          const entries = await queryArxiv({
            id_list: cleanId,
            max_results: 1
          });

          if (entries.length === 0) {
            return {
              contents: [
                {
                  uri: uri.href,
                  text: `Paper with ID "${arxiv_id}" not found.`,
                  mimeType: 'text/plain'
                }
              ]
            };
          }

          const entry = entries[0] as any;
          let output = `**${entry.title}**\n\n`;
          output += `Abstract:\n${entry.summary}`;

          return {
            contents: [
              {
                uri: uri.href,
                text: output,
                mimeType: 'text/plain'
              }
            ]
          };
        } catch (error) {
          return {
            contents: [
              {
                uri: uri.href,
                text: `Error retrieving abstract: ${
                  error instanceof Error ? error.message : String(error)
                }`,
                mimeType: 'text/plain'
              }
            ]
          };
        }
      }
    );

    /**
     * Get paper PDF link
     */
    server.registerResource(
      'paper_pdf',
      new ResourceTemplate('arxiv://paper/{arxiv_id}/pdf', { list: undefined }),
      {
        title: 'Paper PDF Link',
        description:
          'Get the PDF download URL for a specific paper by its Arxiv ID (e.g., arxiv://paper/2301.07041/pdf)'
      },
      async (uri, { arxiv_id }) => {
        try {
          const cleanId = extractArxivId(arxiv_id as string);
          const entries = await queryArxiv({
            id_list: cleanId,
            max_results: 1
          });

          if (entries.length === 0) {
            return {
              contents: [
                {
                  uri: uri.href,
                  text: `Paper with ID "${arxiv_id}" not found.`,
                  mimeType: 'text/plain'
                }
              ]
            };
          }

          const entry = entries[0] as any;
          const pdfLink = entry.links.find((l: any) => l.title === 'pdf');
          const absLink = entry.links.find((l: any) => l.rel === 'alternate');

          let output = `**${entry.title}**\n\n`;
          output += `Authors: ${entry.authors.join(', ')}\n\n`;

          if (pdfLink) {
            output += `PDF Download: ${pdfLink.href}\n`;
          } else {
            output += `PDF Download: https://arxiv.org/pdf/${cleanId}.pdf\n`;
          }

          if (absLink) {
            output += `Abstract Page: ${absLink.href}\n`;
          }

          return {
            contents: [
              {
                uri: uri.href,
                text: output,
                mimeType: 'text/plain'
              }
            ]
          };
        } catch (error) {
          return {
            contents: [
              {
                uri: uri.href,
                text: `Error retrieving PDF link: ${
                  error instanceof Error ? error.message : String(error)
                }`,
                mimeType: 'text/plain'
              }
            ]
          };
        }
      }
    );
  }
);

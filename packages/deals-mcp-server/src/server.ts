import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { allTools } from './tools/index.js';
import { allResources } from './resources/index.js';

/**
 * Create and configure the MCP server for IAB Deals API
 */
export function createServer(): Server {
  const server = new Server(
    {
      name: 'iab-deals-mcp-server',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );

  // Register tool handlers
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: allTools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: {
          type: 'object' as const,
          properties: getSchemaProperties(tool.inputSchema),
          required: getSchemaRequired(tool.inputSchema),
        },
      })),
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    const tool = allTools.find((t) => t.name === name);
    if (!tool) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ error: `Unknown tool: ${name}` }),
          },
        ],
        isError: true,
      };
    }

    try {
      // Validate input
      const validatedArgs = tool.inputSchema.parse(args);
      const result = await tool.handler(validatedArgs);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              error: error instanceof Error ? error.message : 'Unknown error',
            }),
          },
        ],
        isError: true,
      };
    }
  });

  // Register resource handlers
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: allResources.map((resource) => ({
        uri: resource.uri,
        name: resource.name,
        description: resource.description,
        mimeType: resource.mimeType,
      })),
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    const resource = allResources.find((r) => r.uri === uri);
    if (!resource) {
      throw new Error(`Unknown resource: ${uri}`);
    }

    const content = await resource.handler();

    return {
      contents: [
        {
          uri: resource.uri,
          mimeType: resource.mimeType,
          text: content,
        },
      ],
    };
  });

  return server;
}

/**
 * Extract properties from Zod schema for MCP tool definition
 */
function getSchemaProperties(schema: unknown): Record<string, unknown> {
  // Type guard to check if it's a Zod object
  if (schema && typeof schema === 'object' && '_def' in schema) {
    const def = (schema as any)._def;
    if (def.typeName === 'ZodObject' && def.shape) {
      const shape = typeof def.shape === 'function' ? def.shape() : def.shape;
      const properties: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(shape)) {
        properties[key] = extractPropertySchema(value);
      }

      return properties;
    }
  }
  return {};
}

/**
 * Extract required fields from Zod schema
 */
function getSchemaRequired(schema: unknown): string[] {
  if (schema && typeof schema === 'object' && '_def' in schema) {
    const def = (schema as any)._def;
    if (def.typeName === 'ZodObject' && def.shape) {
      const shape = typeof def.shape === 'function' ? def.shape() : def.shape;
      const required: string[] = [];

      for (const [key, value] of Object.entries(shape)) {
        if (value && typeof value === 'object' && '_def' in value) {
          const valueDef = (value as any)._def;
          if (valueDef.typeName !== 'ZodOptional') {
            required.push(key);
          }
        }
      }

      return required;
    }
  }
  return [];
}

/**
 * Extract JSON Schema-like structure from a Zod property
 */
function extractPropertySchema(schema: unknown): Record<string, unknown> {
  if (!schema || typeof schema !== 'object' || !('_def' in schema)) {
    return { type: 'string' };
  }

  const def = (schema as any)._def;
  const description = def.description;

  switch (def.typeName) {
    case 'ZodString':
      return { type: 'string', description };
    case 'ZodNumber':
      return { type: 'number', description };
    case 'ZodBoolean':
      return { type: 'boolean', description };
    case 'ZodArray':
      return {
        type: 'array',
        items: extractPropertySchema(def.type),
        description,
      };
    case 'ZodEnum':
      return { type: 'string', enum: def.values, description };
    case 'ZodOptional':
      return extractPropertySchema(def.innerType);
    case 'ZodDefault':
      return {
        ...extractPropertySchema(def.innerType),
        default: def.defaultValue(),
      };
    case 'ZodObject':
      return {
        type: 'object',
        properties: getSchemaProperties(schema),
        description,
      };
    case 'ZodUnknown':
      return { description };
    default:
      return { type: 'object', description };
  }
}

/**
 * Start the server with stdio transport
 */
export async function startServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    await server.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await server.close();
    process.exit(0);
  });
}

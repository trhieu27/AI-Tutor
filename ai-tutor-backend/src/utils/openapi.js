// Generates a baseline OpenAPI document directly from the mounted Express routers.
const PUBLIC_ENDPOINTS = new Set([
  'GET /',
  'GET /health',
  'POST /api/v1/register',
  'POST /api/v1/login',
  'POST /api/v1/admin-login',
  'POST /api/v1/forgot-password',
  'POST /api/v1/verify-otp',
  'POST /api/v1/reset-password',
  'POST /api/v1/refresh',
  'POST /api/v1/google-login',
  'GET /api/v1/plans',
  'POST /api/v1/plans/webhook/payos',
]);

const SPECIAL_OPERATIONS = {
  'POST /api/v1/documents/upload': {
    summary: 'Upload a document',
    requestBody: {
      required: true,
      content: {
        'multipart/form-data': {
          schema: {
            type: 'object',
            required: ['file'],
            properties: {
              file: { type: 'string', format: 'binary' },
            },
          },
        },
      },
    },
  },
  'POST /api/v1/chat/{documentId}/ask': {
    summary: 'Ask a question about a document',
  },
  'POST /api/v1/chat/{documentId}/ask-stream': {
    summary: 'Ask a question and stream the answer',
    responses: {
      200: {
        description: 'Server-sent event stream',
        content: {
          'text/event-stream': {
            schema: { type: 'string' },
          },
        },
      },
    },
  },
};

function toOpenApiPath(expressPath) {
  return expressPath.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
}

function joinPaths(prefix, routePath) {
  const joined = `${prefix}/${routePath}`.replace(/\/+/g, '/');
  return joined.length > 1 ? joined.replace(/\/$/, '') : joined;
}

function buildOperationId(tag, method, path) {
  const suffix = path
    .replace(/[{}]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  return `${tag}_${method}_${suffix || 'root'}`.toLowerCase();
}

function buildPathParameters(path) {
  return [...path.matchAll(/\{([^}]+)\}/g)].map(match => ({
    name: match[1],
    in: 'path',
    required: true,
    schema: { type: 'string' },
  }));
}

function buildGenericRequestBody(method) {
  if (!['post', 'put', 'patch'].includes(method)) return undefined;
  return {
    required: false,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          additionalProperties: true,
        },
      },
    },
  };
}

function buildDefaultResponses() {
  return {
    200: {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            additionalProperties: true,
          },
        },
      },
    },
    400: { description: 'Invalid request' },
    401: { description: 'Authentication required' },
    500: { description: 'Server error' },
  };
}

function addOperation(paths, method, path, tag) {
  const upperMethod = method.toUpperCase();
  const key = `${upperMethod} ${path}`;
  const special = SPECIAL_OPERATIONS[key] || {};
  const parameters = buildPathParameters(path);
  const requestBody = special.requestBody || buildGenericRequestBody(method);

  paths[path] ||= {};
  paths[path][method] = {
    tags: [tag],
    summary: special.summary || `${upperMethod} ${path}`,
    operationId: buildOperationId(tag, method, path),
    ...(parameters.length > 0 ? { parameters } : {}),
    ...(requestBody ? { requestBody } : {}),
    responses: special.responses || buildDefaultResponses(),
    ...(PUBLIC_ENDPOINTS.has(key) ? { security: [] } : {}),
  };
}

function addRouterOperations(paths, routeGroups) {
  for (const { prefix, tag, router } of routeGroups) {
    for (const layer of router.stack || []) {
      if (!layer.route) continue;

      const routePath = joinPaths(prefix, layer.route.path);
      const openApiPath = toOpenApiPath(routePath);

      for (const method of Object.keys(layer.route.methods)) {
        if (layer.route.methods[method]) {
          addOperation(paths, method, openApiPath, tag);
        }
      }
    }
  }
}

function createOpenApiSpec(routeGroups) {
  const paths = {};

  addOperation(paths, 'get', '/', 'System');
  addOperation(paths, 'get', '/health', 'System');
  addRouterOperations(paths, routeGroups);

  return {
    openapi: '3.1.0',
    info: {
      title: 'AI Tutor Backend API',
      version: '1.0.0',
      description: [
        'Interactive API documentation generated from the Express routes.',
        'Use **Authorize** with an access token for protected endpoints.',
        'WebSocket notifications are available at `/api/v1/ws/notifications?token=JWT`.',
      ].join('\n\n'),
    },
    servers: [{ url: '/', description: 'Current backend server' }],
    tags: routeGroups.map(({ tag }) => ({ name: tag })),
    paths,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  };
}

module.exports = { createOpenApiSpec };

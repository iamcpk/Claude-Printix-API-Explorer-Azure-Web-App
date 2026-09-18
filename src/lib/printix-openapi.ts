// Hand-authored OpenAPI 3.0 spec for the Printix Cloud Print API.
// Source of truth for endpoints: https://printix.github.io/
//
// Printix does not publish a machine-readable spec. This file is a faithful
// reconstruction of the documented endpoints, grouped by resource family.
// All paths are relative to https://api.printix.net/cloudprint.

import { OPERATION_APP_MAP } from "./printix-apps";


const tenantParam = {
  name: "tenantId",
  in: "path",
  required: true,
  schema: { type: "string", format: "uuid" },
  description: "Printix tenant ID (UUID).",
};

const printerParam = {
  name: "printerId",
  in: "path",
  required: true,
  schema: { type: "string", format: "uuid" },
};

const queueParam = {
  name: "queueId",
  in: "path",
  required: true,
  schema: { type: "string", format: "uuid" },
};

const jobParam = {
  name: "jobId",
  in: "path",
  required: true,
  schema: { type: "string", format: "uuid" },
};

const userParam = {
  name: "userId",
  in: "path",
  required: true,
  schema: { type: "string", format: "uuid" },
};

const cardParam = {
  name: "cardId",
  in: "path",
  required: true,
  schema: { type: "string", format: "uuid" },
};

const idParam = (name: string) => ({
  name,
  in: "path",
  required: true,
  schema: { type: "string", format: "uuid" },
});

const pageParams = [
  {
    name: "page",
    in: "query",
    required: false,
    schema: { type: "integer", minimum: 0, default: 0 },
    description: "Zero-based page index.",
  },
  {
    name: "pageSize",
    in: "query",
    required: false,
    schema: { type: "integer", minimum: 1, maximum: 1000, default: 100 },
  },
];

const okBoolResponse = {
  "200": {
    description: "OK",
    content: { "application/json": { schema: { $ref: "#/components/schemas/SuccessEnvelope" } } },
  },
};

const printixOpenApiBase = {
  openapi: "3.0.3",
  info: {
    title: "Printix Cloud Print API",
    version: "1.1",
    description:
      "Interactive console for the Printix Cloud Print API. " +
      "Authenticate once at the top of the page; the access token is automatically attached to every request. " +
      "Official documentation: https://printix.github.io/",
  },
  servers: [{ url: "https://api.printix.net/cloudprint", description: "Production" }],
  security: [],
  tags: [
    { name: "Root", description: "Entry point — lists accessible tenants." },
    { name: "Print Queues", description: "Printers / print queues on a tenant." },
    { name: "Jobs", description: "Submit, query, complete, change owner, delete." },
    { name: "Users", description: "Create, list, delete, ID code." },
    { name: "Cards", description: "Register, search, delete RFID/access cards." },
    { name: "Groups", description: "User groups." },
    { name: "Sites", description: "Physical sites." },
    { name: "Networks", description: "Networks attached to sites." },
    { name: "SNMP", description: "SNMP configurations for printer discovery." },
    { name: "Workstations", description: "Read-only workstation inventory." },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        description:
          "OAuth 2.0 client_credentials access token from https://printix-api-explorer.lovable.app/api/printix-token. " +
          "The auth panel above obtains this for you and injects it automatically.",
      },
      cloudPrintOAuth: {
        type: "oauth2",
        description:
          "Printix 'Cloud Print API' Application. Create in Printix Admin → Settings → Integrations → Applications, then paste the Client ID / Client Secret here.",
        flows: {
          clientCredentials: {
            tokenUrl: "https://auth.printix.net/oauth/token",
            scopes: {},
          },
        },
      },
      userManagerOAuth: {
        type: "oauth2",
        description:
          "Printix 'User Manager' Application. Create in Printix Admin → Settings → Integrations → Applications, then paste the Client ID / Client Secret here.",
        flows: {
          clientCredentials: {
            tokenUrl: "https://auth.printix.net/oauth/token",
            scopes: {},
          },
        },
      },
      cardManagerOAuth: {
        type: "oauth2",
        description:
          "Printix 'Card Manager' Application. Create in Printix Admin → Settings → Integrations → Applications, then paste the Client ID / Client Secret here.",
        flows: {
          clientCredentials: {
            tokenUrl: "https://auth.printix.net/oauth/token",
            scopes: {},
          },
        },
      },
      workstationMonitoringOAuth: {
        type: "oauth2",
        description:
          "Printix 'Workstation Monitoring' Application. Create in Printix Admin → Settings → Integrations → Applications, then paste the Client ID / Client Secret here.",
        flows: {
          clientCredentials: {
            tokenUrl: "https://auth.printix.net/oauth/token",
            scopes: {},
          },
        },
      },
      goRegistrationOAuth: {
        type: "oauth2",
        description:
          "Printix 'Go Registration' Application. Create in Printix Admin → Settings → Integrations → Applications, then paste the Client ID / Client Secret here.",
        flows: {
          clientCredentials: {
            tokenUrl: "https://auth.printix.net/oauth/token",
            scopes: {},
          },
        },
      },
    },
    schemas: {
      SuccessEnvelope: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          message: { type: "string" },
        },
      },
      Link: {
        type: "object",
        properties: {
          href: { type: "string" },
          templated: { type: "boolean" },
        },
      },
      PageInfo: {
        type: "object",
        properties: {
          size: { type: "integer" },
          totalElements: { type: "integer" },
          totalPages: { type: "integer" },
          number: { type: "integer" },
        },
      },
      Job: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          createTime: { type: "string" },
          updateTime: { type: "string" },
          status: { type: "string" },
          ownerId: { type: "string", format: "uuid" },
          contentType: { type: "string" },
          title: { type: "string" },
        },
      },
      SubmitJobRequestV11: {
        type: "object",
        description: "Body for the v1.1 /submit endpoint (send header 'version: 1.1').",
        properties: {
          color: { type: "boolean", default: false },
          duplex: { type: "string", default: "NONE", enum: ["NONE", "SHORT_EDGE", "LONG_EDGE"] },
          page_orientation: { type: "string", default: "AUTO", enum: ["PORTRAIT", "LANDSCAPE", "AUTO"] },
          copies: { type: "integer", minimum: 1, default: 1 },
          media_size: {
            type: "string",
            default: "A4",
            enum: [
              "A0", "A1", "A2", "A3", "A4", "A5", "B4", "B5",
              "ISOA0", "ISOA1", "ISOA2", "ISOA3", "ISOA4", "ISOA5", "ISOB4", "ISOB5",
              "LETTER", "LEGAL", "EXECUTIVE", "EXEC", "COM10", "MONARCH", "DL",
              "ANSIC", "ANSID", "ANSIE", "ARCHC", "ARCHD", "ARCHE",
              "TABLOID", "JISB5", "JISB4", "STATEMENT",
            ],
          },
          scaling: { type: "string", default: "NOSCALE", enum: ["NOSCALE", "SHRINK", "FIT"] },
          userMapping: {
            type: "object",
            properties: {
              key: {
                type: "string",
                enum: ["AzureObjectId", "AzureUPN", "SAMAccountName", "OnPremImmutableId", "OnPremUpn", "Email"],
              },
              value: { type: "string" },
            },
          },
        },
        example: {
          color: false,
          duplex: "NONE",
          page_orientation: "AUTO",
          copies: 1,
          media_size: "A4",
          scaling: "FIT",
          userMapping: {
            key: "Email",
            value: "{{user_email}}",
          },
        },
      },
      CreateUserRequest: {
        type: "object",
        required: ["email", "role"],
        properties: {
          email: { type: "string", format: "email" },
          fullName: { type: "string" },
          role: { type: "string", enum: ["USER", "GUEST_USER"], default: "GUEST_USER" },
          expirationTimestamp: {
            type: "string",
            description: "Expiration timestamp in format 'YYYY.MM.DD HH:mm'.",
            example: "2026.12.31 09:30",
          },
          password: { type: "string", nullable: true },
          pin: { type: "string", nullable: true },
          sendExpirationEmail: { type: "boolean", default: false },
          sendWelcomeEmail: { type: "boolean", default: false },
          welcomeEmailContent: { type: "string", nullable: true },
        },
        example: {
          email: "john.doe@guestuser.local",
          expirationTimestamp: "2026.12.31 09:30",
          fullName: "John Doe",
          password: null,
          pin: null,
          role: "GUEST_USER",
          sendExpirationEmail: false,
          sendWelcomeEmail: false,
          welcomeEmailContent: null,
        },
      },
      RegisterCardRequest: {
        type: "object",
        required: ["secret"],
        properties: {
          secret: { type: "string", description: "Base64-encoded card secret." },
        },
        example: { secret: "base64string" },
      },
      GroupRequest: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", default: "name" },
          externalId: { type: "string", format: "uuid", default: "e06d6e91-a8fb-401b-a17a-a702c249bd31" },
          identityProvider: { type: "string", format: "uuid", default: "60ff178a-3ad4-4bc9-9538-add0e16dc951" },
          description: { type: "string", default: "desc" },
        },
      },
      SiteRequest: {
        type: "object",
        required: ["name", "path"],
        properties: {
          name: { type: "string", description: "The name of the site." },
          path: { type: "string", description: "The path containing the site." },
          adminGroupIds: {
            type: "array",
            description: "List of IDs of admin groups.",
            items: { type: "string", format: "uuid" },
          },
          networkIds: {
            type: "array",
            description: "List of IDs of networks.",
            items: { type: "string", format: "uuid" },
          },
        },
        example: {
          name: "Herlev Transport Headquarters site",
          path: "/Denmark/Herlev",
          adminGroupIds: [],
          networkIds: ["eb4977e1-eae1-4ed1-8631-856d152ff74e"],
        },
      },
      NetworkRequest: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string" },
          homeOffice: { type: "boolean", default: false },
          clientMigratePrintQueues: { type: "string", default: "NO", enum: ["NO", "YES", "USER_DECIDES"] },
          airPrint: { type: "boolean", default: false },
          siteId: { type: "string", format: "uuid", nullable: true },
          gateways: {
            type: "array",
            items: {
              type: "object",
              properties: {
                mac: { type: "string" },
                ip: { type: "string" },
              },
            },
          },
        },
        example: {
          name: "Herlev Transport Headquarters guest network",
          homeOffice: false,
          clientMigratePrintQueues: "NO",
          airPrint: false,
          gateways: [
            {
              mac: "aa11bb22cc33",
              ip: "192.168.2.1",
            },
          ],
          siteId: null,
        },
      },
      SnmpRequest: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string" },
          getCommunityName: { type: "string" },
          setCommunityName: { type: "string" },
          tenantDefault: { type: "boolean" },
          securityLevel: { type: "string", enum: ["NO_AUTH_NO_PRIVACY", "AUTH_NO_PRIVACY", "AUTH_PRIVACY"] },
          version: { type: "string", enum: ["V1", "V2C", "V3"] },
          username: { type: "string", nullable: true },
          contextName: { type: "string", nullable: true },
          authentication: { type: "string", enum: ["SHA", "MD5"] },
          authenticationKey: { type: "string", nullable: true },
          privacy: { type: "string", enum: ["AES", "DES"] },
          privacyKey: { type: "string", nullable: true },
          networkIds: {
            type: "array",
            items: { type: "string", format: "uuid" },
          },
        },
        example: {
          name: "Green configuration",
          getCommunityName: "Green community - get",
          setCommunityName: "Green community - set",
          tenantDefault: false,
          securityLevel: "AUTH_PRIVACY",
          version: "V1",
          username: null,
          contextName: null,
          authentication: "SHA",
          authenticationKey: null,
          privacy: "AES",
          privacyKey: null,
          networkIds: [
            "eb4977e1-eae1-4ed1-8631-856d152ff74e",
            "bc24d10f-d97a-4c2d-ab50-60fd5e42b080",
          ],
        },
      },
    },
  },
  paths: {
    "/": {
      get: {
        tags: ["Root"],
        summary: "Root request — list accessible tenants",
        description:
          "Returns a HAL document with links to every tenant the authenticated application can access.",
        responses: { "200": { description: "HAL document with tenant links." } },
      },
    },

    // -------- Print Queues --------
    "/tenants/{tenantId}/printers": {
      get: {
        tags: ["Print Queues"],
        summary: "List print queues",
        description: "Returns a paged list of print queues for the tenant.",
        parameters: [
          tenantParam,
          ...pageParams,
          { name: "query", in: "query", schema: { type: "string" } },
          { name: "network", in: "query", schema: { type: "string", format: "uuid" } },
          { name: "site", in: "query", schema: { type: "string", format: "uuid" } },
        ],
        responses: { "200": { description: "Paged list of print queues." } },
      },
    },
    "/tenants/{tenantId}/printers/{printerId}/queues/{queueId}": {
      get: {
        tags: ["Print Queues"],
        summary: "Get printer properties",
        parameters: [tenantParam, printerParam, queueParam],
        responses: { "200": { description: "Printer properties." } },
      },
    },

    // -------- Jobs --------
    "/tenants/{tenantId}/printers/{printerId}/queues/{queueId}/submit": {
      post: {
        tags: ["Jobs"],
        summary: "Submit a job",
        description:
          "Creates a print job on the queue. Set the `version: 1.1` header and provide the v1.1 body.",
        parameters: [
          tenantParam,
          printerParam,
          queueParam,
          {
            name: "title",
            in: "query",
            required: true,
            schema: { type: "string" },
            description: "Job title.",
          },
          { name: "user", in: "query", schema: { type: "string" }, description: "Optional user identifier for third-party redirector." },
          { name: "PDL", in: "query", schema: { type: "string", enum: ["PCL5", "PCLXL", "POSTSCRIPT", "UFRII", "TEXT", "XPS"] } },
          { name: "releaseImmediately", in: "query", schema: { type: "boolean", default: false } },
          {
            name: "version",
            in: "header",
            required: true,
            schema: { type: "string", enum: ["1.1"], default: "1.1" },
            description: "Must be `1.1`.",
          },
        ],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SubmitJobRequestV11" },
            },
          },
        },
        responses: {
          "200": { description: "Job created with upload links." },
          "404": { description: "Printer not found." },
        },
      },
    },
    "/tenants/{tenantId}/jobs/{jobId}/changeOwner": {
      post: {
        tags: ["Jobs"],
        summary: "Change job owner",
        parameters: [
          tenantParam,
          jobParam,
          { name: "userEmail", in: "query", required: true, schema: { type: "string", format: "email" } },
        ],
        responses: okBoolResponse,
      },
    },
    "/upload-job-file": {
      put: {
        tags: ["Jobs"],
        summary: "Upload a file",
        description:
          "Uploads a PDF directly to the Azure Blob SAS URL returned by **Submit a job**. " +
          "The console rewrites the request to the provided `uploadUrl`, sends a **PUT**, sets `x-ms-blob-type: BlockBlob`, and does **not** attach a Printix Authorization header (the SAS signature is the credential). Only PDF files are accepted.",
        parameters: [
          {
            name: "uploadUrl",
            in: "query",
            required: true,
            schema: { type: "string", format: "uri" },
            description:
              "The full Azure Blob SAS URL from the Submit a job response (e.g. https://printixjobs.blob.core.windows.net/...?sig=...&sv=...&sp=cw&sr=b).",
          },
          {
            name: "x-ms-blob-type",
            in: "header",
            required: true,
            schema: { type: "string", default: "BlockBlob" },
            description: "Required Azure Blob type header.",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/pdf": {
              schema: { type: "string", format: "binary" },
            },
          },
        },
        responses: {
          "201": { description: "Blob created." },
          "403": { description: "SAS URL invalid or expired." },
        },
      },
    },
    "/tenants/{tenantId}/jobs/{jobId}/completeUpload": {
      post: {
        tags: ["Jobs"],
        summary: "Complete upload",
        description: "Notifies Printix that the document upload is done and the job can proceed.",
        parameters: [tenantParam, jobParam],
        responses: okBoolResponse,
      },
    },
    "/tenants/{tenantId}/jobs": {
      get: {
        tags: ["Jobs"],
        summary: "Retrieve all jobs on the tenant",
        parameters: [
          tenantParam,
          ...pageParams,
          {
            name: "sortOrder",
            in: "query",
            schema: {
              type: "string",
              enum: ["CREATE_TIME", "CREATE_TIME_DESC", "STATUS", "STATUS_DESC", "TITLE", "TITLE_DESC"],
            },
          },
        ],
        responses: { "200": { description: "Paged list of jobs.", content: { "application/json": {} } } },
      },
    },
    "/tenants/{tenantId}/printers/{printerId}/queues/{queueId}/jobs": {
      get: {
        tags: ["Jobs"],
        summary: "Retrieve jobs for a queue",
        parameters: [tenantParam, printerParam, queueParam, ...pageParams],
        responses: { "200": { description: "Paged list of jobs for the queue." } },
      },
    },
    "/tenants/{tenantId}/jobs/{jobId}": {
      get: {
        tags: ["Jobs"],
        summary: "Retrieve a single job",
        parameters: [tenantParam, jobParam],
        responses: {
          "200": {
            description: "Job document.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Job" } } },
          },
        },
      },
    },
    "/tenants/{tenantId}/jobs/{jobId}/delete": {
      post: {
        tags: ["Jobs"],
        summary: "Delete a job",
        parameters: [tenantParam, jobParam],
        responses: okBoolResponse,
      },
    },

    // -------- Users --------
    "/tenants/{tenantId}/users": {
      get: {
        tags: ["Users"],
        summary: "List users",
        parameters: [
          tenantParam,
          ...pageParams,
          { name: "query", in: "query", schema: { type: "string" } },
          { name: "role", in: "query", schema: { type: "string", enum: ["USER", "GUEST_USER"], default: "GUEST_USER" } },
        ],
        responses: { "200": { description: "Paged list of users." } },
      },
    },
    "/tenants/{tenantId}/users/create": {
      post: {
        tags: ["Users"],
        summary: "Create user",
        parameters: [tenantParam],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/CreateUserRequest" } },
          },
        },
        responses: { "200": { description: "User created." } },
      },
    },
    "/tenants/{tenantId}/users/{userId}": {
      get: {
        tags: ["Users"],
        summary: "Retrieve user",
        parameters: [tenantParam, userParam],
        responses: { "200": { description: "User document." } },
      },
    },
    "/tenants/{tenantId}/users/{userId}/delete": {
      post: {
        tags: ["Users"],
        summary: "Delete user",
        parameters: [tenantParam, userParam],
        responses: okBoolResponse,
      },
    },
    "/tenants/{tenantId}/users/{userId}/idCode": {
      post: {
        tags: ["Users"],
        summary: "Generate ID code",
        parameters: [tenantParam, userParam],
        responses: { "200": { description: "Generated ID code." } },
      },
    },

    // -------- Cards --------
    "/tenants/{tenantId}/users/{userId}/cards": {
      get: {
        tags: ["Cards"],
        summary: "List users cards",
        description: "Returns all cards registered for the specified user. Requires Card Manager credentials.",
        parameters: [tenantParam, userParam],
        responses: { "200": { description: "List of cards for the user." } },
      },
      post: {
        tags: ["Cards"],
        summary: "Register a card for a user",
        parameters: [tenantParam, userParam],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/RegisterCardRequest" } },
          },
        },
        responses: { "200": { description: "Card registered." } },
      },
    },

    "/tenants/{tenantId}/cards/{cardId}": {
      get: {
        tags: ["Cards"],
        summary: "Search for a card by ID",
        parameters: [tenantParam, cardParam],
        responses: { "200": { description: "Card document with owner link." } },
      },
      delete: {
        tags: ["Cards"],
        summary: "Delete a user's card",
        parameters: [
          tenantParam,
          {
            name: "cardId",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Either the card ID (UUID) or the base64-encoded card number.",
          },
        ],
        responses: okBoolResponse,
      },
    },

    // -------- Groups --------
    "/tenants/{tenantId}/groups": {
      get: {
        tags: ["Groups"],
        summary: "List or search groups",
        parameters: [
          tenantParam,
          ...pageParams,
          { name: "query", in: "query", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Paged list of groups." } },
      },
      post: {
        tags: ["Groups"],
        summary: "Create group",
        parameters: [tenantParam],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/GroupRequest" } } },
        },
        responses: { "200": { description: "Group created." } },
      },
    },
    "/tenants/{tenantId}/groups/{groupId}": {
      get: {
        tags: ["Groups"],
        summary: "Fetch group details",
        parameters: [tenantParam, idParam("groupId")],
        responses: { "200": { description: "Group document." } },
      },
      delete: {
        tags: ["Groups"],
        summary: "Delete group",
        parameters: [tenantParam, idParam("groupId")],
        responses: okBoolResponse,
      },
    },

    // -------- Sites --------
    "/tenants/{tenantId}/sites": {
      get: {
        tags: ["Sites"],
        summary: "Query sites",
        parameters: [tenantParam, ...pageParams, { name: "query", in: "query", schema: { type: "string" } }],
        responses: { "200": { description: "Paged list of sites." } },
      },
      post: {
        tags: ["Sites"],
        summary: "Create site",
        parameters: [tenantParam],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/SiteRequest" } } } },
        responses: { "200": { description: "Site created." } },
      },
    },
    "/tenants/{tenantId}/sites/{siteId}": {
      get: { tags: ["Sites"], summary: "Retrieve site", parameters: [tenantParam, idParam("siteId")], responses: { "200": { description: "Site document." } } },
      put: {
        tags: ["Sites"],
        summary: "Update site",
        parameters: [tenantParam, idParam("siteId")],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/SiteRequest" } } } },
        responses: okBoolResponse,
      },
      delete: { tags: ["Sites"], summary: "Delete site", parameters: [tenantParam, idParam("siteId")], responses: okBoolResponse },
    },

    // -------- Networks --------
    "/tenants/{tenantId}/networks": {
      get: {
        tags: ["Networks"],
        summary: "Query networks",
        parameters: [tenantParam, ...pageParams, { name: "query", in: "query", schema: { type: "string" } }],
        responses: { "200": { description: "Paged list of networks." } },
      },
      post: {
        tags: ["Networks"],
        summary: "Create network",
        parameters: [tenantParam],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/NetworkRequest" } } } },
        responses: { "200": { description: "Network created." } },
      },
    },
    "/tenants/{tenantId}/networks/{networkId}": {
      get: { tags: ["Networks"], summary: "Retrieve network", parameters: [tenantParam, idParam("networkId")], responses: { "200": { description: "Network document." } } },
      put: {
        tags: ["Networks"],
        summary: "Update network",
        parameters: [tenantParam, idParam("networkId")],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/NetworkRequest" } } } },
        responses: okBoolResponse,
      },
      delete: { tags: ["Networks"], summary: "Delete network", parameters: [tenantParam, idParam("networkId")], responses: okBoolResponse },
    },

    // -------- SNMP --------
    "/tenants/{tenantId}/snmp": {
      get: {
        tags: ["SNMP"],
        summary: "Query SNMP configurations",
        parameters: [tenantParam, ...pageParams, { name: "query", in: "query", schema: { type: "string" } }],
        responses: { "200": { description: "Paged list of SNMP configurations." } },
      },
      post: {
        tags: ["SNMP"],
        summary: "Create SNMP configuration",
        parameters: [tenantParam],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/SnmpRequest" } } } },
        responses: { "200": { description: "SNMP configuration created." } },
      },
    },
    "/tenants/{tenantId}/snmp/{snmpId}": {
      get: { tags: ["SNMP"], summary: "Retrieve SNMP configuration", parameters: [tenantParam, idParam("snmpId")], responses: { "200": { description: "SNMP configuration." } } },
      put: {
        tags: ["SNMP"],
        summary: "Update SNMP configuration",
        parameters: [tenantParam, idParam("snmpId")],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/SnmpRequest" } } } },
        responses: okBoolResponse,
      },
      delete: { tags: ["SNMP"], summary: "Delete SNMP configuration", parameters: [tenantParam, idParam("snmpId")], responses: okBoolResponse },
    },

    // -------- Workstations --------
    "/tenants/{tenantId}/workstations": {
      get: {
        tags: ["Workstations"],
        summary: "Query workstations",
        parameters: [tenantParam, ...pageParams, { name: "query", in: "query", schema: { type: "string" } }],
        responses: { "200": { description: "Paged list of workstations." } },
      },
    },
    "/tenants/{tenantId}/workstations/{workstationId}": {
      get: {
        tags: ["Workstations"],
        summary: "Retrieve workstation",
        parameters: [tenantParam, idParam("workstationId")],
        responses: { "200": { description: "Workstation document." } },
      },
    },
  },
};

// Map each Printix Application to its OAuth2 security scheme name.
const APP_TO_SCHEME: Record<string, string> = {
  cloudPrint: "cloudPrintOAuth",
  userManager: "userManagerOAuth",
  cardManager: "cardManagerOAuth",
  workstationMonitoring: "workstationMonitoringOAuth",
  goRegistration: "goRegistrationOAuth",
};

// Inject per-operation `security` arrays so external Swagger UI instances
// can drive the OAuth2 client_credentials flow per Printix Application.
function withPerOpSecurity<T extends { paths: Record<string, any> }>(spec: T): T {

  const nextPaths: Record<string, any> = {};
  for (const [path, methods] of Object.entries(spec.paths)) {
    const nextMethods: Record<string, any> = {};
    for (const [method, op] of Object.entries<any>(methods as Record<string, any>)) {
      const key = `${method.toUpperCase()} ${path}`;
      const apps = OPERATION_APP_MAP[key];
      if (apps) {
        const list = Array.isArray(apps) ? apps : [apps];
        const security = list
          .map((a) => ({ [APP_TO_SCHEME[a]]: [] as string[] }))
          .concat([{ bearerAuth: [] }]);
        nextMethods[method] = { ...op, security };
      } else {
        // Unmapped ops (e.g. SAS upload) need no Printix auth.
        nextMethods[method] = { ...op, security: [] };
      }
    }
    nextPaths[path] = nextMethods;
  }
  return { ...spec, paths: nextPaths };
}

export const printixOpenApi = withPerOpSecurity(printixOpenApiBase);

export const PRINTIX_TAGS = [
  "Root",
  "Print Queues",
  "Jobs",
  "Users",
  "Cards",
  "Groups",
  "Sites",
  "Networks",
  "SNMP",
  "Workstations",
] as const;
export type PrintixTag = (typeof PRINTIX_TAGS)[number];

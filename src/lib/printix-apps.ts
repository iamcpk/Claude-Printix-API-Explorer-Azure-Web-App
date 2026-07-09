// Printix exposes five distinct "Application" credentials. Each API operation
// requires the access token from one specific app. Credentials are managed
// separately in the auth panel and the right token is selected per request.

export const PRINTIX_APPS = [
  "cloudPrint",
  "userManager",
  "cardManager",
  "workstationMonitoring",
  "goRegistration",
] as const;


export type PrintixApp = (typeof PRINTIX_APPS)[number];

export const PRINTIX_APP_LABEL: Record<PrintixApp, string> = {
  cloudPrint: "Cloud Print API",
  userManager: "User Manager",
  cardManager: "Card Manager",
  workstationMonitoring: "Workstation Monitoring",
  goRegistration: "Go Registration",
};

// Mapping from `${METHOD} ${PATH-TEMPLATE}` to the required Printix application.
// Path templates use the same placeholders as the OpenAPI spec (e.g. {tenantId}).
// Sourced from https://printix.github.io/ — for example "Find User by ID" is
// documented under Card Manager rather than User Manager.
export const OPERATION_APP_MAP: Record<string, PrintixApp | PrintixApp[]> = {
  // Root — requires a Cloud Print API token.
  "GET /": "cloudPrint",

  // Print Queues
  "GET /tenants/{tenantId}/printers": ["cardManager", "cloudPrint"],
  "GET /tenants/{tenantId}/printers/{printerId}/queues/{queueId}": ["cardManager", "cloudPrint"],

  // Jobs
  "POST /tenants/{tenantId}/printers/{printerId}/queues/{queueId}/submit": ["cardManager", "cloudPrint"],
  "POST /tenants/{tenantId}/jobs/{jobId}/completeUpload": ["cardManager", "cloudPrint"],
  "POST /tenants/{tenantId}/jobs/{jobId}/changeOwner": ["cardManager", "cloudPrint"],
  "GET /tenants/{tenantId}/jobs": ["cardManager", "cloudPrint"],
  "GET /tenants/{tenantId}/printers/{printerId}/queues/{queueId}/jobs": ["cardManager", "cloudPrint"],
  "GET /tenants/{tenantId}/jobs/{jobId}": ["cardManager", "cloudPrint"],
  "POST /tenants/{tenantId}/jobs/{jobId}/delete": ["cardManager", "cloudPrint"],

  // Users — "Find User by ID" (Retrieve user) uses Card Manager per Printix docs.
  // Delete user accepts Card Manager, User Manager, or Cloud Print API tokens.
  "GET /tenants/{tenantId}/users": ["cardManager", "userManager", "cloudPrint"],
  "POST /tenants/{tenantId}/users/create": ["cardManager", "userManager", "cloudPrint"],
  "GET /tenants/{tenantId}/users/{userId}": "cardManager",
  "POST /tenants/{tenantId}/users/{userId}/delete": ["cardManager", "userManager", "cloudPrint"],
  "POST /tenants/{tenantId}/users/{userId}/idCode": "cardManager",

  // Cards
  "GET /tenants/{tenantId}/users/{userId}/cards": "cardManager",
  "POST /tenants/{tenantId}/users/{userId}/cards": "cardManager",
  "DELETE /tenants/{tenantId}/cards/{cardId}": "cardManager",
  "GET /tenants/{tenantId}/cards/{cardId}": "cardManager",

  // Groups
  "GET /tenants/{tenantId}/groups": "cloudPrint",
  "POST /tenants/{tenantId}/groups": "cloudPrint",
  "GET /tenants/{tenantId}/groups/{groupId}": "cloudPrint",
  "DELETE /tenants/{tenantId}/groups/{groupId}": "cloudPrint",

  // Sites / Networks / SNMP — Go Registration manages on-prem infrastructure
  "GET /tenants/{tenantId}/sites": "cloudPrint",
  "POST /tenants/{tenantId}/sites": "cloudPrint",
  "GET /tenants/{tenantId}/sites/{siteId}": "cloudPrint",
  "PUT /tenants/{tenantId}/sites/{siteId}": "cloudPrint",
  "DELETE /tenants/{tenantId}/sites/{siteId}": "cloudPrint",
  "GET /tenants/{tenantId}/networks": "cloudPrint",
  "POST /tenants/{tenantId}/networks": "cloudPrint",
  "GET /tenants/{tenantId}/networks/{networkId}": "cloudPrint",
  "PUT /tenants/{tenantId}/networks/{networkId}": "cloudPrint",
  "DELETE /tenants/{tenantId}/networks/{networkId}": "cloudPrint",
  "GET /tenants/{tenantId}/snmp": "cloudPrint",
  "POST /tenants/{tenantId}/snmp": "cloudPrint",
  "GET /tenants/{tenantId}/snmp/{snmpId}": "cloudPrint",
  "PUT /tenants/{tenantId}/snmp/{snmpId}": "cloudPrint",
  "DELETE /tenants/{tenantId}/snmp/{snmpId}": "cloudPrint",

  // Workstations
  "GET /tenants/{tenantId}/workstations": "workstationMonitoring",
  "GET /tenants/{tenantId}/workstations/{workstationId}": "workstationMonitoring",
};

const API_BASE_PATH = "/cloudprint";

export function appsForOperationKey(key: string): PrintixApp[] {
  const v = OPERATION_APP_MAP[key];
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

// Return every Printix app whose token is accepted for the given request.
// Order matters: the first entry is the preferred app.
export function appsForRequest(method: string, url: string): PrintixApp[] {
  let pathname: string;
  try {
    pathname = new URL(url, "https://api.printix.net").pathname;
  } catch {
    pathname = url;
  }
  if (pathname.startsWith(API_BASE_PATH)) {
    pathname = pathname.slice(API_BASE_PATH.length) || "/";
  }
  const m = method.toUpperCase();
  for (const key of Object.keys(OPERATION_APP_MAP)) {
    const [keyMethod, keyPath] = key.split(" ");
    if (keyMethod !== m) continue;
    const regex = new RegExp(
      "^" + keyPath.replace(/\{[^/}]+\}/g, "[^/]+") + "/?$",
    );
    if (regex.test(pathname)) return appsForOperationKey(key);
  }
  return [];
}

// Back-compat: first accepted app or null.
export function appForRequest(method: string, url: string): PrintixApp | null {
  return appsForRequest(method, url)[0] ?? null;
}

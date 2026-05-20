import { authFetch } from "@/shared/services/api.service";

const ADMIN_BASE = "/api/v1/admin";
const ADMIN_CACHE_TTL_MS = 60_000;
const adminCache = new Map();
let overviewRequest = null;
let overviewFailureUntil = 0;
let overviewFailureMessage = "";
const OVERVIEW_FAILURE_COOLDOWN_MS = 30_000;

function buildQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    query.set(key, String(value));
  });
  const text = query.toString();
  return text ? `?${text}` : "";
}

async function readJson(response, fallback = null) {
  const text = await response.text();
  if (!text.trim()) return fallback;
  return JSON.parse(text);
}

async function adminJson(path, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  const response = await authFetch(`${ADMIN_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const error = await readJson(response, {});
    throw new Error(error.detail || "Không thể tải dữ liệu admin");
  }

  const data = await readJson(response, method === "DELETE" ? {} : null);
  if (method === "GET") {
    adminCache.set(path, { data, cachedAt: Date.now() });
  } else {
    adminCache.clear();
  }
  return data;
}

function readAdminCache(path, ttlMs = ADMIN_CACHE_TTL_MS) {
  const entry = adminCache.get(path);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > ttlMs) {
    adminCache.delete(path);
    return null;
  }
  return entry.data;
}

export function clearAdminCache() {
  adminCache.clear();
}

export function fetchAdminOverview() {
  const cached = readAdminCache("/overview", ADMIN_CACHE_TTL_MS);
  if (cached) return Promise.resolve(cached);
  if (overviewRequest) return overviewRequest;
  if (Date.now() < overviewFailureUntil) {
    return Promise.reject(new Error(overviewFailureMessage || "Không thể tải dữ liệu admin"));
  }

  overviewRequest = adminJson("/overview")
    .then((data) => {
      overviewFailureUntil = 0;
      overviewFailureMessage = "";
      return data;
    })
    .catch((err) => {
      overviewFailureUntil = Date.now() + OVERVIEW_FAILURE_COOLDOWN_MS;
      overviewFailureMessage = err.message;
      throw err;
    })
    .finally(() => {
      overviewRequest = null;
    });
  return overviewRequest;
}

export function readCachedAdminOverview() {
  return readAdminCache("/overview", ADMIN_CACHE_TTL_MS);
}

export function fetchAdminUsers(params) {
  return adminJson(`/users${buildQuery(params)}`);
}

export function readCachedAdminUsers(params) {
  return readAdminCache(`/users${buildQuery(params)}`);
}

export function fetchAdminUserDetail(id) {
  return adminJson(`/users/${encodeURIComponent(id)}`);
}

export function updateAdminUser(id, payload) {
  return adminJson(`/users/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function updateAdminSubscription(id, payload) {
  return adminJson(`/users/${encodeURIComponent(id)}/subscription`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchAdminRevenue(params) {
  return adminJson(`/revenue${buildQuery(params)}`);
}

export function readCachedAdminRevenue(params) {
  return readAdminCache(`/revenue${buildQuery(params)}`);
}

export function fetchAdminTransactions(params) {
  return adminJson(`/transactions${buildQuery(params)}`);
}

export function readCachedAdminTransactions(params) {
  return readAdminCache(`/transactions${buildQuery(params)}`);
}

export function fetchAdminActivity(params) {
  return adminJson(`/activity${buildQuery(params)}`);
}

export function readCachedAdminActivity(params) {
  return readAdminCache(`/activity${buildQuery(params)}`);
}

export function fetchAdminDocuments(params) {
  return adminJson(`/documents${buildQuery(params)}`);
}

export function readCachedAdminDocuments(params) {
  return readAdminCache(`/documents${buildQuery(params)}`);
}

export function retryAdminDocument(id) {
  return adminJson(`/documents/${encodeURIComponent(id)}/retry`, { method: "POST" });
}

export function deleteAdminDocument(id) {
  return adminJson(`/documents/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function fetchAdminPlans() {
  return adminJson("/plans");
}

export function readCachedAdminPlans() {
  return readAdminCache("/plans");
}

export function updateAdminPlan(id, payload) {
  return adminJson(`/plans/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function fetchAdminAudit(params) {
  return adminJson(`/audit${buildQuery(params)}`);
}

export function readCachedAdminAudit(params) {
  return readAdminCache(`/audit${buildQuery(params)}`);
}

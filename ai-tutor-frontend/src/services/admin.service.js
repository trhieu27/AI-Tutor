import { authFetch } from "@/services/api.service";

const ADMIN_BASE = "/api/v1/admin";

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

  return readJson(response, options.method === "DELETE" ? {} : null);
}

export function fetchAdminOverview() {
  return adminJson("/overview");
}

export function fetchAdminUsers(params) {
  return adminJson(`/users${buildQuery(params)}`);
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

export function fetchAdminActivity(params) {
  return adminJson(`/activity${buildQuery(params)}`);
}

export function fetchAdminDocuments(params) {
  return adminJson(`/documents${buildQuery(params)}`);
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

export function updateAdminPlan(id, payload) {
  return adminJson(`/plans/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function fetchAdminAudit(params) {
  return adminJson(`/audit${buildQuery(params)}`);
}

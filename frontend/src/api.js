const API_URL = import.meta.env.VITE_API_URL || 'https://nexus-billing-72h9.onrender.com/api';
const TOKEN_KEY = 'nexus_token';

let unauthorizedHandler = () => {};

export const tokenStore = {
  get: () => sessionStorage.getItem(TOKEN_KEY),
  set: (token) => sessionStorage.setItem(TOKEN_KEY, token),
  clear: () => sessionStorage.removeItem(TOKEN_KEY),
};

export const setUnauthorizedHandler = (handler) => {
  unauthorizedHandler = handler;
};

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const request = async (path, options = {}) => {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${tokenStore.get()}`,
    },
  });

  if (response.status === 401) {
    unauthorizedHandler();
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(response.status, body.message || 'Request failed');
  }

  return response;
};

export const listInvoices = async () => (await request('/invoices')).json();

export const getInvoice = async (id) => (await request(`/invoices/${id}`)).json();

export const startCheckout = async (id) =>
  (await request(`/invoices/${id}/checkout`, { method: 'POST' })).json();

export const resendReceipt = async (id) =>
  (await request(`/invoices/${id}/receipt/resend`, { method: 'POST' })).json();

export const downloadReceipt = async (id, filename) => {
  const response = await request(`/invoices/${id}/receipt`);
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
};

/**
 * API Client for MeowChat Backend
 * Handles HTTP requests with authentication
 */

import { auth } from "../config/firebase";
import { API_BASE_URL } from "../config/api";

export class APIError extends Error {
  constructor(public status: number, message: string, public data?: any) {
    super(message);
    this.name = "APIError";
  }
}

class APIClient {
  private baseURL: string;
  private authToken: string | null = null;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string | null) {
    this.authToken = token;
  }

  /**
   * Get current Firebase ID token
   */
  async getFirebaseToken(): Promise<string | null> {
    try {
      const user = auth.currentUser;
      if (user) {
        return await user.getIdToken();
      }
      return null;
    } catch (error) {
      console.error("Error getting Firebase token:", error);
      return null;
    }
  }

  /**
   * Get headers for requests
   */
  private async getHeaders(isFormData: boolean = false): Promise<HeadersInit> {
    const headers: HeadersInit = {};

    if (!isFormData) {
      headers["Content-Type"] = "application/json";
    }

    // Get Firebase token for authentication
    const firebaseToken = await this.getFirebaseToken();
    if (firebaseToken) {
      headers["Authorization"] = `Bearer ${firebaseToken}`;
    } else if (this.authToken) {
      headers["Authorization"] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  /**
   * Handle API response
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get("content-type");
    const isJson = contentType?.includes("application/json");

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      let errorData = null;

      if (isJson) {
        try {
          errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          // Failed to parse error JSON
        }
      }

      throw new APIError(response.status, errorMessage, errorData);
    }

    if (isJson) {
      return await response.json();
    }

    return response as any;
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    try {
      let url = `${this.baseURL}${endpoint}`;

      if (params) {
        const queryString = new URLSearchParams(params).toString();
        url += `?${queryString}`;
      }

      const headers = await this.getHeaders();
      const response = await fetch(url, {
        method: "GET",
        headers,
      });

      return await this.handleResponse<T>(response);
    } catch (error) {
      console.error(`GET ${endpoint} failed:`, error);
      throw error;
    }
  }

  /**
   * POST request
   */
  async post<T>(
    endpoint: string,
    data?: any,
    isFormData: boolean = false
  ): Promise<T> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const headers = await this.getHeaders(isFormData);

      const body = isFormData ? data : JSON.stringify(data);

      const response = await fetch(url, {
        method: "POST",
        headers,
        body,
      });

      return await this.handleResponse<T>(response);
    } catch (error) {
      console.error(`POST ${endpoint} failed:`, error);
      throw error;
    }
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: any): Promise<T> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const headers = await this.getHeaders();

      const response = await fetch(url, {
        method: "PUT",
        headers,
        body: JSON.stringify(data),
      });

      return await this.handleResponse<T>(response);
    } catch (error) {
      console.error(`PUT ${endpoint} failed:`, error);
      throw error;
    }
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<T> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const headers = await this.getHeaders();

      const response = await fetch(url, {
        method: "DELETE",
        headers,
      });

      return await this.handleResponse<T>(response);
    } catch (error) {
      console.error(`DELETE ${endpoint} failed:`, error);
      throw error;
    }
  }

  /**
   * Upload file
   */
  async upload<T>(
    endpoint: string,
    file: any,
    additionalData?: Record<string, any>
  ): Promise<T> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const headers = await this.getHeaders(true);

      const formData = new FormData();
      formData.append("file", file);

      if (additionalData) {
        Object.keys(additionalData).forEach((key) => {
          formData.append(key, additionalData[key]);
        });
      }

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: formData,
      });

      return await this.handleResponse<T>(response);
    } catch (error) {
      console.error(`UPLOAD ${endpoint} failed:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const apiClient = new APIClient();
export default apiClient;

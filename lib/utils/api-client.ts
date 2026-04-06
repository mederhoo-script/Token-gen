interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function apiRequest<T>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  return response.json() as Promise<ApiResponse<T>>;
}

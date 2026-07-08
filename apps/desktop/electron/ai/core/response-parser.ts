export function parseResponse(response: string): unknown {
  try {
    return JSON.parse(response);
  } catch {
    return response;
  }
}
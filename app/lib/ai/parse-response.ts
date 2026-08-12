export class MalformedGroqResponseError extends Error {
  constructor(rawResponse: string) {
    super(`Could not extract a valid JSON object from Groq response: ${rawResponse.slice(0, 200)}`);
  }
}

export function extractJsonObject<T = unknown>(rawResponse: string): T {
  const start = rawResponse.indexOf("{");
  const end = rawResponse.lastIndexOf("}");

  if (start === -1 || end === -1 || end < start) {
    throw new MalformedGroqResponseError(rawResponse);
  }

  const candidate = rawResponse.slice(start, end + 1);

  try {
    return JSON.parse(candidate) as T;
  } catch {
    throw new MalformedGroqResponseError(rawResponse);
  }
}

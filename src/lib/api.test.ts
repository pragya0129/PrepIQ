import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { apiRequest } from "@/lib/api";
import { getMockAttemptItems, type MockAttempt, type PaginatedMockAttempts } from "@/lib/store";

describe("apiRequest", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("includes the saved bearer token in authenticated requests", async () => {
    localStorage.setItem(
      "prepiq_session",
      JSON.stringify({
        user: { id: "user-1", name: "Test User", email: "test@example.com" },
        token: "sample-token",
      }),
    );

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    vi.stubGlobal("fetch", fetchMock);

    const payload = await apiRequest<{ status: string }>("/api/health");

    expect(payload).toEqual({ status: "ok" });
    const [, options] = fetchMock.mock.calls[0];
    const headers = new Headers(options?.headers);
    expect(headers.get("Authorization")).toBe("Bearer sample-token");
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("surfaces backend error messages from the JSON detail field", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: "Invalid credentials" }), {
        status: 401,
        statusText: "Unauthorized",
        headers: { "Content-Type": "application/json" },
      }),
    );

    vi.stubGlobal("fetch", fetchMock);

    await expect(apiRequest("/api/auth/login", { method: "POST" })).rejects.toThrow("Invalid credentials");
  });
});

describe("getMockAttemptItems", () => {
  const attempt: MockAttempt = {
    id: "attempt-1",
    sessionId: "session-1",
    userId: "user-1",
    question: "Tell me about a project.",
    userAnswer: "I built a dashboard.",
    aiScore: 7,
    aiFeedback: {
      strengths: ["Clear"],
      missing: ["Metrics"],
      modelAnswer: "Use STAR.",
      oneLineVerdict: "Good start",
      confidenceAnalysis: {
        confidenceScore: 60,
        sentiment: "neutral",
        specificity: 10,
        wordCount: 4,
      },
    },
    createdAt: "2026-05-18T00:00:00Z",
  };

  it("supports the paginated backend response shape", () => {
    const payload: PaginatedMockAttempts = {
      items: [attempt],
      total: 1,
      limit: 20,
      offset: 0,
    };

    expect(getMockAttemptItems(payload)).toEqual([attempt]);
  });

  it("keeps backward compatibility with array responses", () => {
    expect(getMockAttemptItems([attempt])).toEqual([attempt]);
  });
});

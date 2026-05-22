import { NextResponse } from "next/server";

import { serverConfig } from "@/server/config";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": serverConfig.api.corsOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };
}

export function apiResponse(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      ...corsHeaders(),
      ...(init?.headers ?? {})
    }
  });
}

export function apiError(message: string, status = 400) {
  return apiResponse(
    {
      success: false,
      error: message
    },
    { status }
  );
}

export function handleOptions() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders()
  });
}

export async function readJson<T>(request: Request) {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

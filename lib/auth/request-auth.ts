import { createSupabaseServerClient } from "@/lib/supabase/server";

export function getBearerToken(request: Request): string | undefined {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return undefined;
  }

  return authHeader.replace("Bearer ", "");
}

export async function getUserFromRequest(request: Request) {
  const token = getBearerToken(request);
  const supabase = createSupabaseServerClient(token);

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}
import { getCurrentSession } from "./session-service";
import { isSuperAdmin } from "./profile-service";

export async function requireSuperAdmin() {
  const session = await getCurrentSession();

  if (!session) {
    throw new Error("UNAUTHORIZED");
  }

  if (!isSuperAdmin(session.profile)) {
    throw new Error("FORBIDDEN");
  }

  return session;
}
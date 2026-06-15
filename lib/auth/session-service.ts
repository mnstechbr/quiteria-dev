import { getCurrentUser } from "./auth-service";
import { getProfileByUserId } from "./profile-service";

export async function getCurrentSession() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const profile = await getProfileByUserId(user.id);

  return {
    user,
    profile,
  };
}
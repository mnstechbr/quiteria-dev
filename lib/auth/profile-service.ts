import { getUserProfile } from "./profile-repository";
import { UserProfile } from "@/types/auth";

export async function getProfileByUserId(
  userId: string,
): Promise<UserProfile | null> {
  return getUserProfile(userId);
}

export function isSuperAdmin(profile: UserProfile | null): boolean {
  return profile?.global_role === "SUPER_ADMIN";
}

export function isRegularUser(profile: UserProfile | null): boolean {
  return profile?.global_role === "USER";
}
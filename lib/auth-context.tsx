"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  userId: string;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  userId: "",
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

const PUBLIC_PATHS = ["/login", "/privacy", "/terms"];
const ONBOARDING_PATHS = [
  "/onboarding/age-gate",
  "/onboarding/terms",
  "/onboarding/setup",
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    return data as Profile | null;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const p = await fetchProfile(user.id);
    setProfile(p);
  }, [user, fetchProfile]);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    router.push("/login");
  }, [router]);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        const p = await fetchProfile(currentUser.id);
        setProfile(p);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        const p = await fetchProfile(currentUser.id);
        setProfile(p);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  // Routing logic — runs after auth resolves
  useEffect(() => {
    if (loading) return;

    const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
    const isOnboarding = ONBOARDING_PATHS.some((p) => pathname.startsWith(p));

    if (!user) {
      if (!isPublic) router.push("/login");
      return;
    }

    // Logged in — check onboarding gates in order
    if (!isPublic) {
      if (!profile?.age_verified && !isOnboarding) {
        router.push("/onboarding/age-gate");
        return;
      }
      if (!profile?.terms_accepted && !isOnboarding) {
        router.push("/onboarding/terms");
        return;
      }
      if (!profile?.username && !isOnboarding) {
        router.push("/onboarding/setup");
        return;
      }
    }
  }, [loading, user, profile, pathname, router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        userId: user?.id ?? "",
        profile,
        loading,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

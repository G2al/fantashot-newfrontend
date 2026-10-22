"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

export default function HomePage() {
  const router = useRouter();
  const { isReady, isAuthenticated } = useAuth();
  useEffect(() => {
    if (isReady) router.replace(`${isAuthenticated ? "/dashboard" : "/login"}${window.location.search}${window.location.hash}`);
  }, [isReady, isAuthenticated, router]);
  return null;
}

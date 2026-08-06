"use client";

import { AuthProvider } from "@/context/AuthContext";
import { AppDataProvider } from "@/context/AppDataContext";

export default function Providers({ children }) {
  return (
    <AuthProvider>
      <AppDataProvider>{children}</AppDataProvider>
    </AuthProvider>
  );
}

"use client";

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { supabase, supabaseConfigured } from "@/lib/supabaseClient";

const AuthContext = createContext(null);
const NAME_KEY = "clausement:playerName";

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [isTrainer, setIsTrainer] = useState(false);
  const [myName, setMyName] = useState(null);

  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }
    let active = true;

    async function init() {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setSession(data.session || null);
      if (data.session) {
        await syncNameForSession(data.session);
      }
      setLoading(false);
    }
    init();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        await syncNameForSession(newSession);
      } else {
        setIsTrainer(false);
        setMyName(null);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Bepaalt in één keer of dit een trainer- of spelerssessie is, en welke
  // naam bij het logboek hoort. Trainers hebben geen speler-rij nodig (zie
  // briefing-vervolg) — die krijgen automatisch hun e-mailadres als naam,
  // zodat ze de losse naamkeuze-stap nooit te zien krijgen. Anonieme
  // spelerssessies hebben geen e-mail, dus worden hier nooit als trainer
  // herkend.
  async function syncNameForSession(session) {
    let trainer = false;
    try {
      const { data, error } = await supabase.rpc("am_i_trainer");
      trainer = !error && Boolean(data);
    } catch {
      trainer = false;
    }
    setIsTrainer(trainer);
    const stored = localStorage.getItem(NAME_KEY);
    if (stored) {
      setMyName(stored);
    } else if (trainer && session.user?.email) {
      localStorage.setItem(NAME_KEY, session.user.email);
      setMyName(session.user.email);
    } else {
      setMyName(null);
    }
  }

  const pickPlayerName = useCallback(async (name) => {
    if (!session) {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) return { ok: false, error: error.message };
    }
    localStorage.setItem(NAME_KEY, name);
    setMyName(name);
    return { ok: true };
  }, [session]);

  const setDisplayNameOnly = useCallback((name) => {
    localStorage.setItem(NAME_KEY, name);
    setMyName(name);
  }, []);

  const trainerLogin = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }, []);

  const signOut = useCallback(async () => {
    localStorage.removeItem(NAME_KEY);
    setMyName(null);
    setIsTrainer(false);
    await supabase.auth.signOut();
  }, []);

  const value = useMemo(
    () => ({
      loading,
      session,
      isTrainer,
      myName,
      loggedIn: Boolean(session && myName),
      hasSession: Boolean(session),
      pickPlayerName,
      setDisplayNameOnly,
      trainerLogin,
      signOut,
    }),
    [loading, session, isTrainer, myName, pickPlayerName, setDisplayNameOnly, trainerLogin, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

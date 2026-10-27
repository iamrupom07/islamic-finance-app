import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { api, dataOf, sessions, onSessionCleared } from "../api/client";
import type { Session, Me } from "../api/types";
import { ApiError, humanError } from "../api/errors";
type State = {
  status: "loading" | "anonymous" | "authenticated" | "unavailable";
  user: Session["user"] | null;
  account: Me | null;
  error: string | null;
  accept: (s: Session) => Promise<void>;
  reload: () => Promise<void>;
  logout: () => Promise<void>;
  clear: () => Promise<void>;
};
const Context = createContext<State | null>(null);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<State["status"]>("loading");
  const [user, setUser] = useState<Session["user"] | null>(null);
  const [account, setAccount] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);
  const clear = useCallback(async () => {
    await sessions.clear();
    setUser(null);
    setAccount(null);
    setStatus("anonymous");
  }, []);
  const reload = useCallback(async () => {
    let expected: string | undefined;
    try {
      if (!sessions.accessToken) await sessions.restore();
      expected = sessions.user?.id;
      const me = dataOf(await api.GET("/v1/bootstrap"));
      if (
        !expected ||
        sessions.user?.id !== expected ||
        me.user.id !== expected
      )
        return;
      setAccount(me);
      setUser(me.user);
      setStatus("authenticated");
      setError(null);
    } catch (e) {
      if (expected && sessions.user?.id !== expected) return;
      setError(humanError(e));
      setStatus(
        e instanceof ApiError && e.status === 401 ? "anonymous" : "unavailable",
      );
      throw e;
    }
  }, []);
  const accept = useCallback(
    async (s: Session) => {
      await sessions.accept(s);
      setUser(s.user);
      await reload();
    },
    [reload],
  );
  useEffect(() => {
    onSessionCleared(() => {
      setUser(null);
      setAccount(null);
      setStatus("anonymous");
    });
    void sessions
      .restore()
      .then((s) => (s ? reload() : setStatus("anonymous")))
      .catch((e) => {
        setError(humanError(e));
        setStatus(
          e instanceof ApiError && e.status === 401
            ? "anonymous"
            : "unavailable",
        );
      });
  }, [reload]);
  const logout = async () => {
    await api.POST("/v1/auth/logout");
    await clear();
  };
  return (
    <Context.Provider
      value={{ status, user, account, error, accept, reload, logout, clear }}
    >
      {children}
    </Context.Provider>
  );
}
export function useAuth() {
  const value = useContext(Context);
  if (!value) throw Error("AUTH_PROVIDER_MISSING");
  return value;
}

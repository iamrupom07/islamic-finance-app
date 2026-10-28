import React, { createContext, useContext, useState } from "react";
const Layout = createContext({
  playerHeight: 0,
  dockHeight: 76,
  setPlayerHeight: (n: number) => {
    void n;
  },
  setDockHeight: (n: number) => {
    void n;
  },
});
export function PlayerLayoutProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [playerHeight, setPlayerHeight] = useState(0),
    [dockHeight, setDockHeight] = useState(76);
  return (
    <Layout.Provider
      value={{ playerHeight, dockHeight, setPlayerHeight, setDockHeight }}
    >
      {children}
    </Layout.Provider>
  );
}
export const usePlayerLayout = () => useContext(Layout);

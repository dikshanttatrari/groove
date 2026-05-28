import { createContext, useState, useContext } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("groove_token"));

  const login = (newToken, user) => {
    localStorage.setItem("groove_token", newToken);
    localStorage.setItem("groove_user", JSON.stringify(user));
    setToken(newToken);
  };

  return (
    <AuthContext.Provider value={{ token, login }}>
      {children}
    </AuthContext.Provider>
  );
};

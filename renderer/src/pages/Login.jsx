import React, { useState } from "react";
const api = window.auth;

export default function Login({ onLogin, toast }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");

  async function login() {
    const res = await api.secure("login", user, pass);

    if (res.ok) {
      onLogin(res.user);
    } else {
      toast.error("Sai tài khoản");
    }
  }

  return (
    <div className="login">
      <h2>Welcome</h2>

      <input
        placeholder="Username"
        value={user}
        onChange={e => setUser(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        value={pass}
        onChange={e => setPass(e.target.value)}
      />

      <button onClick={login}>Login</button>
    </div>
  );
}

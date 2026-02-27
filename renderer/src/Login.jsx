import { useState } from "react";
import { login, register } from "./auth";

export default function Login({ onSuccess, onClose  }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [mode, setMode] = useState("login");

  async function submit() {
    try {
      if (mode === "login") {
        await login(user, pass);
      } else {
        await register(user, pass);
        alert("Đăng ký xong — hãy login");
        setMode("login");
        return;
      }

      onSuccess();
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <div className="modal">
      <div className="box">
        <h2>{mode === "login" ? "Login" : "Register"}</h2>

        <input value={user} onChange={e => setUser(e.target.value)} />
        <input type="password" value={pass}
               onChange={e => setPass(e.target.value)} />

        <button onClick={submit}>OK</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

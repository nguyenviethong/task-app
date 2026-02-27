import { createPortal } from "react-dom";
import "./login.css";
import { useState } from "react";
import "./calendar.css";
import { login, register } from "./auth";

export default function LoginModal({ onSuccess, onClose, toast }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");
  
  async function submit() {
    try {
	  if (username && password) {
		let userInfo;
		if (mode === "login") {
			userInfo = await login(username, password);
		  } else {
			await register(username, password);
			//alert("Đăng ký xong — hãy login");
			setError("Đăng ký xong — hãy login");
			//toast.success("Đăng ký xong — hãy login");
			setMode("login");
			return;
		  }

		  onSuccess(userInfo.username);
	  }else{
		  //toast.error("Chưa nhập user hoặc pass");
		  setError("Chưa nhập user hoặc pass");
	  }
      
	  
    } catch (e) {
      //alert(e.message);
	  setError(e.message);
    }
  }
  
  function getPortalRoot() {
	  let root = document.getElementById("overlay-root");

	  if (!root) {
		root = document.createElement("div");
		root.id = "overlay-root";
		document.body.appendChild(root);
	  }

	  return root;
	}

	return createPortal(
	  <div className="modal-overlay" onClick={onClose}>
		<div
		  className="modal-box"
		  onClick={(e) => e.stopPropagation()}
		>
		  {error && <div>⚠ {error}</div>}
		  <h2>{mode === "login" ? "Login" : "Register"}</h2>

		  <input id="id_username"
			placeholder="Username"
			value={username}
			onChange={e => setUsername(e.target.value)}
		  />

		  <input
			type="password"
			placeholder="Password"
			value={password}
			onChange={e => setPassword(e.target.value)}
		  />
		  
		  <button className="btn primary" onClick={submit}>
		   {mode === "login" ? "Đăng nhập" : "Đăng ký"}
		  </button>

		  <div className="switch-mode">
		  {mode === "login" ? (
			<>
			  Chưa có tài khoản?{" "}
			  <span onClick={() => setMode("register")}>
				Đăng ký
			  </span>
			</>
		  ) : (
			<>
			  Đã có tài khoản?{" "}
			  <span onClick={() => setMode("login")}>
				Đăng nhập
			  </span>
			</>
		  )}
		</div>
		  
		  
		</div>
	  </div>,
	  getPortalRoot()
	);

}

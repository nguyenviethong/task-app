const fs = require("fs");
const crypto = require("crypto");
const path = require("path");
const { fingerprint } = require("./machine");
const { app } = require("electron");

const LICENSE_PATH = path.join(process.env.APPDATA, "myapp.lic");

//const PUBLIC_KEY = fs.readFileSync("./public.pem", "utf8");
let pemPath;
if (app.isPackaged) {
  // chạy app build
  pemPath = path.join(process.resourcesPath, "public.pem");
} else {
  // chạy dev
  pemPath = path.join(__dirname, "../public.pem");
}
const PUBLIC_KEY = fs.readFileSync(pemPath, "utf8");

function verifyLicense() {
  if (!fs.existsSync(LICENSE_PATH)) return { valid: false };
  try{
	  const raw = JSON.parse(fs.readFileSync(LICENSE_PATH, "utf8"));

	  const verify = crypto.createVerify("SHA256");
	  verify.update(JSON.stringify(raw.data));

	  const ok = verify.verify(PUBLIC_KEY, raw.sig, "base64");
	  console.error("ok lic:", ok);
	  if (!ok) return { valid: false };
      console.error("machine lic:", raw.data.machine);
	  if (raw.data.machine !== fingerprint())
		return { valid: false };

	  const exp = new Date(raw.data.exp + "T23:59:59");
	  console.error("exp lic:", exp);
	  if (Date.now() > exp.getTime())
		return { valid: false };

	  return { valid: true, data: raw.data };
  }catch(e){
	   console.error("verifyLicense license error:", e);
	  return { valid: false };
  }
  
}

function saveLicense(payload) {
  try { 
    fs.writeFileSync(LICENSE_PATH, JSON.stringify(payload, null, 2));
    console.log("License saved:", LICENSE_PATH);
  } catch (e) {
    console.error("Save license error:", e);
  }
}

module.exports = { verifyLicense, saveLicense };

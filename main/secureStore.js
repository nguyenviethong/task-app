const crypto = require("crypto");
const fs = require("fs");

const KEY = crypto
  .createHash("sha256")
  .update("your-secret-key")
  .digest();

function encrypt(data) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", KEY, iv);
  let enc = cipher.update(JSON.stringify(data));
  enc = Buffer.concat([enc, cipher.final()]);
  return iv.toString("hex") + ":" + enc.toString("hex");
}

function decrypt(str) {
  const [ivHex, dataHex] = str.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const data = Buffer.from(dataHex, "hex");

  const decipher = crypto.createDecipheriv("aes-256-cbc", KEY, iv);
  let dec = decipher.update(data);
  dec = Buffer.concat([dec, decipher.final()]);
  return JSON.parse(dec.toString());
}

module.exports = { encrypt, decrypt };

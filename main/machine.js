const os = require("os");
const crypto = require("crypto");

function fingerprint() {
  const data = [
    os.hostname(),
    os.arch(),
    os.cpus()[0].model,
    os.totalmem()
  ].join("|");

  return crypto
    .createHash("sha256")
    .update(data)
    .digest("hex");
}

module.exports = { fingerprint };

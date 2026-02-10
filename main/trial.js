const fs = require("fs");
const path = require("path");

const TRIAL_PATH = path.join(process.env.APPDATA, "trial.dat");

function checkTrial() {
  if (!fs.existsSync(TRIAL_PATH)) {
    fs.writeFileSync(TRIAL_PATH, Date.now().toString());
    return { valid: true, days: 30 };
  }

  const start = Number(fs.readFileSync(TRIAL_PATH));
  const diff = (Date.now() - start) / 86400000;
  //const left = 7 - Math.floor(diff);
  const left = 30 - Math.floor(diff);

  return { valid: left > 0, days: left };
}

module.exports = { checkTrial };

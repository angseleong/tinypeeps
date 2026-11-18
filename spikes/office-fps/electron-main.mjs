// Throwaway: opens the spike page in a plain Electron window and prints its RESULT line.
//   electron electron-main.mjs "?label=a&chars=6" [--uncapped] [--shot=/path/out.png]
import { writeFileSync } from "node:fs";
import { app, BrowserWindow } from "electron";

const query = process.argv.find((a) => a.startsWith("?")) ?? "";
const shot = process.argv.find((a) => a.startsWith("--shot="))?.slice(7);
if (process.argv.includes("--uncapped")) {
  app.commandLine.appendSwitch("disable-frame-rate-limit");
  app.commandLine.appendSwitch("disable-gpu-vsync");
}

app.whenReady().then(() => {
  const [width, height] = (process.argv.find((a) => a.startsWith("--size="))?.slice(7) ?? "1280x800").split("x").map(Number);
  const win = new BrowserWindow({ width, height, webPreferences: { backgroundThrottling: false } });
  win.webContents.on("console-message", (...args) => {
    const msg = typeof args[0]?.message === "string" ? args[0].message : args[2];
    if (typeof msg !== "string") return;
    if (msg.startsWith("RESULT ") || msg.startsWith("INFO ") || msg.startsWith("WARN ") || msg.includes("THREE.")) console.log(msg);
    if (msg.startsWith("RESULT ")) {
      (shot ? win.webContents.capturePage().then((img) => writeFileSync(shot, img.toPNG())) : Promise.resolve()).then(() => app.quit());
    }
  });
  win.loadURL(`http://localhost:5199/${query}`);
  setTimeout(() => {
    console.log("TIMEOUT");
    app.quit();
  }, 90000);
});

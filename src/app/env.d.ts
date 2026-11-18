/// <reference types="vite/client" />
import type { Api } from "../desktop/preload";

declare global {
  interface Window {
    tiny: Api;
  }
}

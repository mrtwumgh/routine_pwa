// Reminder server settings. This is the same Cloudflare worker the fitness app uses.
// The VAPID public key is safe to commit. Never put the private key anywhere in this repo.

export const PUSH_URL = "https://strength-push.strength-push.workers.dev";
export const VAPID_PUBLIC =
  "BEgaVhIiJCHn586sNP1UfjlJlZUolQydNk1_J0ieDrj3Df349mrXIR36dv6ifiXTYeJE1SxyijWHk4NiiNZSNmQ";

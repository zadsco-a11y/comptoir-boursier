// API pour "Le Comptoir Boursier", adaptée à Netlify Functions + Netlify Blobs.
// Netlify Blobs est un stockage clé-valeur intégré à Netlify : il joue ici le
// même rôle que window.storage dans les artéfacts Claude, mais fonctionne
// pour un vrai site déployé, accessible par n'importe qui avec le lien.

import { getStore } from "@netlify/blobs";

// Doit rester identique à ADMIN_PASSCODE dans public/index.html.
// C'est ce qui protège réellement les routes d'administration côté serveur
// (et pas seulement l'écran de connexion admin).
const ADMIN_PASSCODE = "formateur2026";

const DEFAULT_CONFIG = {
  stocks: [
    { symbol: "LUM", name: "Lumière Éclat", sector: "Maquillage", price: 4200 },
    { symbol: "VLR", name: "Velours Noir", sector: "Parfum", price: 15800 },
    { symbol: "ORB", name: "Or Rose Beauté", sector: "Soin", price: 9600 },
    { symbol: "NCS", name: "Nacre & Soie", sector: "Capillaire", price: 3100 },
    { symbol: "AMB", name: "Ambre Doré", sector: "Parfum", price: 21000 },
    { symbol: "PIV", name: "Pivoine Sauvage", sector: "Soin", price: 5400 },
    { symbol: "CDN", name: "Cristal de Nuit", sector: "Maquillage", price: 7300 },
    { symbol: "IVS", name: "Ivoire Sublime", sector: "Capillaire", price: 2600 },
  ],
  startCash: 500000,
  tickIntervalSec: 4,
  volatility: 0.06,
  showLeaderboard: true,
  marketStartTime: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}
function isAdmin(req) {
  return req.headers.get("x-admin-passcode") === ADMIN_PASSCODE;
}

export default async (req) => {
  const store = getStore("comptoir-boursier");
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean); // ex: ["api","trainee","marie"]
  const method = req.method;

  try {
    // ---- /api/config ----
    if (parts[1] === "config") {
      if (method === "GET") {
        let config = await store.get("config", { type: "json" });
        if (!config) {
          config = { ...DEFAULT_CONFIG, marketStartTime: new Date().toISOString() };
          await store.setJSON("config", config);
        }
        return json(config);
      }
      if (method === "PUT") {
        if (!isAdmin(req)) return json({ error: "non autorisé" }, 401);
        const body = await req.json();
        if (!body.config || !Array.isArray(body.config.stocks)) {
          return json({ error: "config invalide" }, 400);
        }
        const updated = { ...body.config, updatedAt: new Date().toISOString() };
        if (body.restart) updated.marketStartTime = new Date().toISOString();
        await store.setJSON("config", updated);
        return json(updated);
      }
    }

    // ---- /api/leaderboard (public, mais respecte le réglage admin) ----
    if (parts[1] === "leaderboard" && method === "GET") {
      const config = await store.get("config", { type: "json" });
      if (!config || !config.showLeaderboard) {
        return json({ error: "classement désactivé" }, 403);
      }
      const { blobs } = await store.list({ prefix: "trainee:" });
      const results = [];
      for (const b of blobs) {
        const t = await store.get(b.key, { type: "json" });
        if (t) results.push({ name: t.name, cash: t.cash, holdings: t.holdings || {} });
      }
      return json(results);
    }

    // ---- /api/trainees (liste complète, réservée à l'admin) ----
    if (parts[1] === "trainees") {
      if (method === "GET") {
        if (!isAdmin(req)) return json({ error: "non autorisé" }, 401);
        const { blobs } = await store.list({ prefix: "trainee:" });
        const results = [];
        for (const b of blobs) {
          const t = await store.get(b.key, { type: "json" });
          if (t) results.push(t);
        }
        return json(results);
      }
      if (method === "DELETE") {
        if (!isAdmin(req)) return json({ error: "non autorisé" }, 401);
        const { blobs } = await store.list({ prefix: "trainee:" });
        for (const b of blobs) await store.delete(b.key);
        return json({ ok: true });
      }
    }

    // ---- /api/trainee/:id ----
    if (parts[1] === "trainee" && parts[2]) {
      const id = decodeURIComponent(parts[2]);
      const key = "trainee:" + id;
      if (method === "GET") {
        const t = await store.get(key, { type: "json" });
        if (!t) return json({ error: "stagiaire introuvable" }, 404);
        return json(t);
      }
      if (method === "PUT") {
        const body = await req.json();
        const trainee = { ...body, id, updatedAt: Date.now() };
        await store.setJSON(key, trainee);
        return json(trainee);
      }
      if (method === "DELETE") {
        if (!isAdmin(req)) return json({ error: "non autorisé" }, 401);
        await store.delete(key);
        return json({ ok: true });
      }
    }

    // ---- /api/messages (messagerie stagiaire → administrateur) ----
    if (parts[1] === "messages") {
      if (method === "GET") {
        if (!isAdmin(req)) return json({ error: "non autorisé" }, 401);
        const { blobs } = await store.list({ prefix: "message:" });
        const results = [];
        for (const b of blobs) {
          const m = await store.get(b.key, { type: "json" });
          if (m) results.push(m);
        }
        results.sort((a, b) => b.createdAt - a.createdAt);
        return json(results);
      }
      if (method === "POST") {
        const body = await req.json();
        const text = (body.text || "").trim().slice(0, 1000);
        const traineeName = (body.traineeName || "").trim().slice(0, 60);
        if (!text || !traineeName) return json({ error: "message invalide" }, 400);
        const id = crypto.randomUUID();
        const message = {
          id,
          traineeId: (body.traineeId || "").trim(),
          traineeName,
          text,
          read: false,
          createdAt: Date.now(),
        };
        await store.setJSON("message:" + id, message);
        return json(message);
      }
      if (method === "DELETE") {
        if (!isAdmin(req)) return json({ error: "non autorisé" }, 401);
        const { blobs } = await store.list({ prefix: "message:" });
        for (const b of blobs) await store.delete(b.key);
        return json({ ok: true });
      }
    }

    // ---- /api/message/:id ----
    if (parts[1] === "message" && parts[2]) {
      if (!isAdmin(req)) return json({ error: "non autorisé" }, 401);
      const id = decodeURIComponent(parts[2]);
      const key = "message:" + id;
      if (method === "PUT") {
        const existing = await store.get(key, { type: "json" });
        if (!existing) return json({ error: "message introuvable" }, 404);
        const updated = { ...existing, read: true };
        await store.setJSON(key, updated);
        return json(updated);
      }
      if (method === "DELETE") {
        await store.delete(key);
        return json({ ok: true });
      }
    }

    return json({ error: "route inconnue" }, 404);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
};

export const config = { path: "/api/*" };

const fetch = require("node-fetch");
const { randomUUID: nativeRandomUUID } = require("crypto");

// Fallback UUIDv4 if Node runtime doesn't have crypto.randomUUID
const randomUUID = nativeRandomUUID || (() =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0, v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  })
);

const VIDA_TOKEN_URL = "https://qa-sso.vida.id/auth/realms/vida/protocol/openid-connect/token";
const VIDA_CLIENT_ID = "partner-demotest-sso-sandbox";
const VIDA_CLIENT_SECRET = "pr42jmfddaQnozhwzwW7utDkWi3vAhER";

const VIDA_VERIFY_SUMMARY_URL = "https://my-services-sandbox.np.vida.id/api/v1/verify/summary";

exports.handler = async (event) => {
  try {
    const { imageBase64 } = JSON.parse(event.body || "{}");
    if (!imageBase64) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing imageBase64" }) };
    }

    // 1) Get OAuth token
    const tokenRes = await fetch(VIDA_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        scope: "roles",
        client_id: VIDA_CLIENT_ID,
        client_secret: VIDA_CLIENT_SECRET
      })
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      return { statusCode: 502, body: JSON.stringify({ error: "Failed to get token", details: tokenData }) };
    }
    const accessToken = tokenData.access_token;

    // 2) Build verify/summary request
    const partnerTrxId = `trx_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const groupId = randomUUID();
    const obtainedAt = String(Math.floor(Date.now() / 1000)); // epoch seconds
    const userIPHeader = event.headers["x-nf-client-connection-ip"] || event.headers["x-forwarded-for"] || "";
    const userIP = userIPHeader.split(",")[0].trim() || "0.0.0.0";

    const payload = {
      operations: ["ocr", "idVerification"],
      payload: {
        partnerTrxId,
        groupId,
        idType: "ID_CARD",
        country: "IDN",
        idSubtype: "KTP",
        idFrontSideImage: imageBase64
      },
      userConsent: {
        userIP,
        country: "IDN",
        obtained: true,
        obtainedAt
      }
    };

    const vsRes = await fetch(VIDA_VERIFY_SUMMARY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify(payload)
    });

    const vsJson = await vsRes.json().catch(() => ({}));
    if (!vsRes.ok) {
      // Surface VIDA error response so you can see what it needs
      return { statusCode: vsRes.status, body: JSON.stringify({ error: "VIDA verify/summary error", data: vsJson }) };
    }

    // 3) Normalize into fixed columns for the UI table
    const getPath = (obj, path) =>
      path.split(".").reduce((acc, k) => (acc && acc[k] != null ? acc[k] : undefined), obj);

    // Try multiple likely paths (since different accounts/versions may shape data slightly differently)
    const pick = (...paths) => {
      for (const p of paths) {
        const v = getPath(vsJson, p);
        if (v != null && v !== "") return String(v);
      }
      return undefined;
    };

    // Common locations to probe (adjust if your account returns different keys)
    // Often the OCR piece is nested somewhere like:
    //   data.ocr.result.fields.*, or summary.ocr.*, or result.ocr.*, etc.
    const fields = {
      nik:           pick("data.ocr.nik", "data.ocr.result.nik", "summary.ocr.nik", "ocr.nik", "result.ocr.nik") || "-",
      fullName:      pick("data.ocr.name", "data.ocr.result.name", "summary.ocr.name", "ocr.name", "result.ocr.name", "data.ocr.full_name") || "-",
      placeOfBirth:  pick("data.ocr.place_of_birth", "data.ocr.result.place_of_birth", "ocr.place_of_birth") || "-",
      dateOfBirth:   pick("data.ocr.date_of_birth", "data.ocr.result.date_of_birth", "ocr.date_of_birth", "data.ocr.dob") || "-",
      gender:        pick("data.ocr.gender", "data.ocr.result.gender", "ocr.gender") || "-",
      address:       pick("data.ocr.address", "data.ocr.result.address", "ocr.address") || "-",
      rtRw:          pick("data.ocr.rt_rw", "data.ocr.result.rt_rw", "ocr.rt_rw", "data.ocr.rtrw") || "-",
      kelDesa:       pick(





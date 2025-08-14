const fetch = require("node-fetch");

// SAFETY NOTE: these are your sandbox creds, hardcoded by request.
const VIDA_TOKEN_URL = "https://qa-sso.vida.id/auth/realms/vida/protocol/openid-connect/token";
const VIDA_CLIENT_ID = "partner-demotest-sso-sandbox";
const VIDA_CLIENT_SECRET = "pr42jmfddaQnozhwzwW7utDkWi3vAhER";

// This endpoint expects: { "parameters": { "image": "<BASE64>" } }
const VIDA_OCR_URL = "https://services-sandbox.vida.id/verify/v1/ktp/ocr/transaction";

exports.handler = async (event) => {
  try {
    const { imageBase64 } = JSON.parse(event.body || "{}");
    if(!imageBase64){
      return { statusCode: 400, body: JSON.stringify({ error: "Missing imageBase64" }) };
    }

    // 1) Get access token
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

    // 2) Call VIDA OCR (IMPORTANT: wrap inside "parameters")
    const ocrRes = await fetch(VIDA_OCR_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        parameters: { image: imageBase64 }
      })
    });

    const ocrJson = await ocrRes.json().catch(() => ({}));
    if(!ocrRes.ok){
      return { statusCode: ocrRes.status, body: JSON.stringify({ error: "VIDA OCR error", data: ocrJson }) };
    }

    // 3) Normalize -> fixed columns
    // (Adjust keys to match VIDA’s actual response in your account)
    const get = (obj, pathArr) => {
      for (const p of pathArr) {
        const parts = Array.isArray(p) ? p : [p];
        for (const key of parts) {
          const v = key.split(".").reduce((a,k) => (a && a[k] != null ? a[k] : undefined), obj);
          if (v != null && v !== "") return String(v);
        }
      }
      return undefined;
    };

    // Try common KTP field names (fallback to "-")
    const fields = {
      nik:            get(ocrJson, ["nik", "data.nik", "result.nik"]) || "-",
      fullName:       get(ocrJson, ["name", "full_name", "data.name", "result.name"]) || "-",
      placeOfBirth:   get(ocrJson, ["place_of_birth", "birth_place", "data.place_of_birth"]) || "-",
      dateOfBirth:    get(ocrJson, ["date_of_birth", "dob", "birth_date", "data.date_of_birth"]) || "-",
      gender:         get(ocrJson, ["gender", "sex", "data.gender"]) || "-",
      address:        get(ocrJson, ["address", "alamat", "data.address"]) || "-",
      rtRw:           get(ocrJson, ["rt_rw", "rtrw", "rtRw", "data.rt_rw"]) || "-",
      kelDesa:        get(ocrJson, ["village", "kel_desa", "kelurahan", "data.village"]) || "-",
      kecamatan:      get(ocrJson, ["district", "kecamatan", "data.district"]) || "-",
      religion:       get(ocrJson, ["religion", "agama", "data.religion"]) || "-",
      maritalStatus:  get(ocrJson, ["marital_status", "status_perkawinan", "data.marital_status"]) || "-",
      occupation:     get(ocrJson, ["occupation", "job", "pekerjaan", "data.occupation"]) || "-",
      nationality:    get(ocrJson, ["nationality", "kewarganegaraan", "data.nationality"]) || "-"
    };

    // 4) Return normalized fields (and keep raw for debugging if needed)
    return {
      statusCode: 200,
      body: JSON.stringify({ fields })
    };

  } catch (err) {
    return { statusCode: 500, body:




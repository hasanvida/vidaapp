const fetch = require("node-fetch");

exports.handler = async (event) => {
  try {
    const { image } = JSON.parse(event.body);

    // Get access token from VIDA
    const tokenRes = await fetch("https://qa-sso.vida.id/auth/realms/vida/protocol/openid-connect/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: "partner-demotest-sso-sandbox",
        client_secret: "pr42jmfddaQnozhwzwW7utDkWi3vAhER",
        grant_type: "client_credentials"
      })
    });
    const tokenData = await tokenRes.json();
    const token = tokenData.access_token;

    // Call VIDA OCR API
    const ocrRes = await fetch("https://services-sandbox.vida.id/verify/v1/ktp/ocr/transaction", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ image: image })
    });

    const ocrData = await ocrRes.json();

    return {
      statusCode: 200,
      body: JSON.stringify(ocrData)
    };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};


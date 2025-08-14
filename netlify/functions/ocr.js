const fetch = require("node-fetch");

exports.handler = async (event) => {
  try {
    const { base64Image } = JSON.parse(event.body);

    const tokenRes = await fetch("https://qa-sso.vida.id/auth/realms/vida/protocol/openid-connect/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        scope: "roles",
        client_id: "partner-demotest-sso-sandbox",
        client_secret: "pr42jmfddaQnozhwzwW7utDkWi3vAhER"
      })
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error("Failed to get access token");

    const ocrRes = await fetch("https://my-services-sandbox.np.vida.id/api/v1/verify/summary", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenData.access_token}`
      },
      body: JSON.stringify({
        operations: ["ocr", "idVerification"],
        payload: {
          partnerTrxId: Math.random().toString(36).substr(2, 10),
          groupId: "860c9c61-4fb5-464f-89f8-baf2458890ea",
          idType: "ID_CARD",
          country: "IDN",
          idSubtype: "KTP",
          idFrontSideImage: base64Image
        },
        userConsent: {
          userIP: "0.0.0.0",
          country: "IDN",
          obtained: true,
          obtainedAt: Math.floor(Date.now() / 1000).toString()
        }
      })
    });

    const ocrData = await ocrRes.json();
    return {
      statusCode: 200,
      body: JSON.stringify(ocrData)
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

const fetch = require("node-fetch");

exports.handler = async (event) => {
  try {
    const { ktp_image } = JSON.parse(event.body);

    if (!ktp_image) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing KTP image" })
      };
    }

    // Get access token from VIDA
    const tokenRes = await fetch("https://qa-sso.vida.id/auth/realms/vida/protocol/openid-connect/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: "partner-demotest-sso-sandbox",
        client_secret: "pr42jmfddaQnozhwzwW7utDkWi3vAhER",
        grant_type: "client_credentials",
        scope: "roles"
      })
    });

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Failed to get access token", details: tokenData })
      };
    }

    // VIDA request payload
    const payload = {
      operations: ["ocr", "idVerification"],
      payload: {
        partnerTrxId: "test-trx-" + Date.now(),
        groupId: "group-" + Date.now(),
        idType: "ID_CARD",
        country: "IDN",
        idSubtype: "KTP",
        idFrontSideImage: ktp_image
      },
      userConsent: {
        userIP: "0.0.0.0",
        country: "IDN",
        obtained: true,
        obtainedAt: Math.floor(Date.now() / 1000)
      }
    };

    const vidaRes = await fetch("https://my-services-sandbox.np.vida.id/api/v1/verify/summary", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`
      },
      body: JSON.stringify(payload)
    });

    const vidaData = await vidaRes.json();

    return {
      statusCode: vidaRes.status,
      body: JSON.stringify(vidaData)
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};






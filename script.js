const fileInput = document.getElementById("fileInput");
const preview = document.getElementById("preview");
const uploadBtn = document.getElementById("uploadBtn");
const ocrResult = document.getElementById("ocrResult");
const backBtn = document.getElementById("backBtn");
const uploadPage = document.getElementById("upload-page");
const resultPage = document.getElementById("result-page");

let base64Image = "";

// Preview image
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      base64Image = e.target.result.split(",")[1];
      preview.src = e.target.result;
      uploadBtn.disabled = false;
    };
    reader.readAsDataURL(file);
  }
});

// Handle OCR
uploadBtn.addEventListener("click", async () => {
  uploadBtn.disabled = true;
  ocrResult.textContent = "Processing...";

  try {
    // 1️⃣ Get Auth Token
    const tokenRes = await fetch(
      "https://qa-sso.vida.id/auth/realms/vida/protocol/openid-connect/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          scope: "roles",
          client_id: "partner-demotest-sso-sandbox",
          client_secret: "pr42jmfddaQnozhwzwW7utDkWi3vAhER"
        })
      }
    );

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error("Auth failed");

    // 2️⃣ Call OCR API
    const ocrRes = await fetch(
      "https://my-services-sandbox.np.vida.id/api/v1/verify/summary",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenData.access_token}`
        },
        body: JSON.stringify({
          operations: ["ocr", "idVerification"],
          payload: {
            partnerTrxId: Date.now().toString(),
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
            obtainedAt: Math.floor(Date.now() / 1000)
          }
        })
      }
    );

    const ocrData = await ocrRes.json();

    // 3️⃣ Show Result
    uploadPage.style.display = "none";
    resultPage.style.display = "block";
    ocrResult.textContent = JSON.stringify(ocrData, null, 2);
  } catch (err) {
    alert("Error: " + err.message);
    uploadBtn.disabled = false;
  }
});

// Back button
backBtn.addEventListener("click", () => {
  resultPage.style.display = "none";
  uploadPage.style.display = "block";
  uploadBtn.disabled = true;
  fileInput.value = "";
  preview.src = "";
});


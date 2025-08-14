let base64Image = "";

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = error => reject(error);
  });
}

document.getElementById("previewBtn").addEventListener("click", async () => {
  const file = document.getElementById("fileInput").files[0] || document.getElementById("cameraInput").files[0];
  if (!file) {
    alert("Please upload or take a KTP photo first.");
    return;
  }

  base64Image = await fileToBase64(file);
  document.getElementById("previewImage").src = URL.createObjectURL(file);

  document.getElementById("uploadSection").style.display = "none";
  document.getElementById("previewSection").style.display = "block";
});

document.getElementById("backToUpload").addEventListener("click", () => {
  document.getElementById("previewSection").style.display = "none";
  document.getElementById("uploadSection").style.display = "block";
});

document.getElementById("processBtn").addEventListener("click", async () => {
  document.getElementById("previewSection").style.display = "none";
  document.getElementById("resultSection").style.display = "block";
  document.getElementById("result").innerText = "Processing...";

  const res = await fetch("/.netlify/functions/ocr", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base64Image })
  });

  const data = await res.json();
  document.getElementById("result").innerText = JSON.stringify(data, null, 2);
});

document.getElementById("backToUploadFromResult").addEventListener("click", () => {
  document.getElementById("resultSection").style.display = "none";
  document.getElementById("uploadSection").style.display = "block";
});

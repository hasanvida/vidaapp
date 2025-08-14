let stream = null;
let imageBase64 = null;

const $ = (id) => document.getElementById(id);

// Sections
const uploadSection = $("uploadSection");
const resultSection = $("resultSection");

// Elements
const fileInput = $("fileInput");
const btnFile = $("btnFile");
const btnCamera = $("btnCamera");
const cameraWrap = $("cameraWrap");
const video = $("video");
const btnCapture = $("btnCapture");
const btnStopCam = $("btnStopCam");

const previewWrap = $("previewWrap");
const previewImg = $("previewImg");
const btnProcess = $("btnProcess");
const btnBack1 = $("btnBack1");
const btnBack2 = $("btnBack2");

const resultBody = $("resultBody");

// Helpers
function show(el){ el.classList.remove("hidden"); }
function hide(el){ el.classList.add("hidden"); }
function toBase64FromDataURL(dataURL){ return dataURL.split(",")[1]; }

// File upload
btnFile.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const dataURL = reader.result;
    imageBase64 = toBase64FromDataURL(dataURL);
    previewImg.src = dataURL;
    show(previewWrap);
  };
  reader.readAsDataURL(file);
});

// Camera
btnCamera.addEventListener("click", async () => {
  try{
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio:false });
    video.srcObject = stream;
    await video.play();
    show(cameraWrap);
  }catch(err){
    alert("Cannot open camera: " + err.message);
  }
});

btnCapture.addEventListener("click", () => {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const dataURL = canvas.toDataURL("image/jpeg", 0.92);
  imageBase64 = toBase64FromDataURL(dataURL);
  previewImg.src = dataURL;
  show(previewWrap);
});

btnStopCam.addEventListener("click", () => {
  if(stream){ stream.getTracks().forEach(t => t.stop()); stream = null; }
  hide(cameraWrap);
});

// Back buttons
btnBack1.addEventListener("click", () => {
  imageBase64 = null;
  if(stream){ stream.getTracks().forEach(t => t.stop()); stream = null; }
  hide(cameraWrap);
  hide(previewWrap);
});
btnBack2.addEventListener("click", () => {
  imageBase64 = null;
  hide(resultSection);
  show(uploadSection);
});

// Process OCR
btnProcess.addEventListener("click", async () => {
  if(!imageBase64){ alert("Please select or capture a KTP image first."); return; }
  btnProcess.disabled = true;
  btnProcess.textContent = "Processing...";
  try{
    const res = await fetch("/.netlify/functions/ocr", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ imageBase64 })
    });
    const data = await res.json();

    // Render fixed columns
    const fields = [
      ["nik", "NIK"],
      ["fullName", "Full Name"],
      ["placeOfBirth", "Place of Birth"],
      ["dateOfBirth", "Date of Birth"],
      ["gender", "Gender"],
      ["address", "Address"],
      ["rtRw", "RT/RW"],
      ["kelDesa", "Kel/Desa"],
      ["kecamatan", "Kecamatan"],
      ["religion", "Religion"],
      ["maritalStatus", "Marital Status"],
      ["occupation", "Occupation"],
      ["nationality", "Nationality"]
    ];

    resultBody.innerHTML = "";
    fields.forEach(([key, label]) => {
      const val = (data && data.fields && data.fields[key]) ? data.fields[key] : "-";
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${label}</td><td>${val}</td>`;
      resultBody.appendChild(tr);
    });

    hide(uploadSection);
    show(resultSection);
  }catch(err){
    alert("OCR error: " + err.message);
  }finally{
    btnProcess.disabled = false;
    btnProcess.textContent = "Process OCR";
  }
});

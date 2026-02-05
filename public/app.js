const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const ingestBtn = document.getElementById("ingestBtn");
const ingestFeedback = document.getElementById("ingestFeedback");
const systemStatus = document.getElementById("systemStatus");

const chatWindow = document.getElementById("chatWindow");
const questionInput = document.getElementById("questionInput");
const DEFAULT_TOP_K = 6;
const fileAlert = document.getElementById("fileAlert");
const fileSelect = document.getElementById("fileSelect");
const askBtn = document.getElementById("askBtn");
const chatFeedback = document.getElementById("chatFeedback");

const API_BASE = window.location.origin.includes("localhost:3000")
  ? "http://localhost:3001"
  : "/api";
const indexedFiles = [];
let activeFile = "";

function setStatus(text, success = true) {
  systemStatus.textContent = text;
  systemStatus.style.background = success ? "var(--green-700)" : "var(--brown-700)";
}

function renderMessage(text, who) {
  const bubble = document.createElement("div");
  bubble.className = `message ${who}`;
  bubble.textContent = text;
  chatWindow.appendChild(bubble);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function getSelectedFiles() {
  return Array.from(fileInput.files ?? []);
}

function renderFileAlert() {
  if (indexedFiles.length === 0) {
    fileAlert.textContent = "Nenhum documento indexado ainda.";
    fileAlert.classList.add("is-warning");
    fileSelect.disabled = true;
    return;
  }

  fileAlert.textContent = `Arquivos indexados: ${indexedFiles.length}.`;
  fileAlert.classList.remove("is-warning");
  fileSelect.disabled = false;
}

function renderFileOptions() {
  const current = activeFile;
  fileSelect.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Selecione um arquivo";
  fileSelect.appendChild(placeholder);

  indexedFiles.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    if (name === current) option.selected = true;
    fileSelect.appendChild(option);
  });
}

function updateFileSelection(nextValue) {
  activeFile = nextValue;
  if (!activeFile && indexedFiles.length > 0) {
    activeFile = indexedFiles[0];
  }
  renderFileOptions();
  renderFileAlert();
}

dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropZone.classList.remove("dragover");
  const files = Array.from(event.dataTransfer?.files ?? []);
  fileInput.files = new DataTransfer().files;
  const dataTransfer = new DataTransfer();
  files.forEach((file) => dataTransfer.items.add(file));
  fileInput.files = dataTransfer.files;
});

ingestBtn.addEventListener("click", async () => {
  const files = getSelectedFiles();
  ingestFeedback.textContent = "";

  if (files.length === 0) {
    ingestFeedback.textContent = "Selecione pelo menos um arquivo.";
    return;
  }

  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  try {
    setStatus("Indexando documentos...");
    ingestBtn.disabled = true;

    const response = await fetch(`${API_BASE}/ingest`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Erro ao indexar");

    const fileNames = (data.files ?? []).map((file) => file.name);
    fileNames.forEach((name) => {
      if (!indexedFiles.includes(name)) indexedFiles.push(name);
    });
    updateFileSelection(activeFile || indexedFiles[0] || "");

    ingestFeedback.textContent = `Indexados ${data.indexed} arquivo(s).`;
    setStatus("Memória atualizada");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha na indexação";
    ingestFeedback.textContent = message;
    setStatus("Erro na indexação", false);
  } finally {
    ingestBtn.disabled = false;
  }
});

fileSelect.addEventListener("change", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLSelectElement)) return;
  updateFileSelection(target.value);
});

askBtn.addEventListener("click", async () => {
  const question = questionInput.value.trim();
  chatFeedback.textContent = "";

  if (!question) {
    chatFeedback.textContent = "Digite uma pergunta.";
    return;
  }

  renderMessage(question, "user");
  questionInput.value = "";

  try {
    askBtn.disabled = true;
    const response = await fetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        topK: DEFAULT_TOP_K,
        fileName: activeFile || undefined,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Erro no chat");

    renderMessage(data.answer ?? "Sem resposta.", "bot");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao conversar";
    renderMessage(message, "bot");
  } finally {
    askBtn.disabled = false;
  }
});

renderFileAlert();

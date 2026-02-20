const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const ingestBtn = document.getElementById("ingestBtn");
const reindexBtn = document.getElementById("reindexBtn");
const deleteFileBtn = document.getElementById("deleteFileBtn");
const ingestFeedback = document.getElementById("ingestFeedback");
const systemStatus = document.getElementById("systemStatus");
const selectedFiles = document.getElementById("selectedFiles");

const chatWindow = document.getElementById("chatWindow");
const questionInput = document.getElementById("questionInput");
const DEFAULT_TOP_K = 6;
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const fileAlert = document.getElementById("fileAlert");
const fileSelect = document.getElementById("fileSelect");
const askBtn = document.getElementById("askBtn");
const chatFeedback = document.getElementById("chatFeedback");

const isLocalhost =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";
const API_BASE = isLocalhost ? "http://localhost:3001" : "/api";

const indexedFiles = [];
let activeFile = "";

function getAuthHeaders() {
  const token = localStorage.getItem("apiToken")?.trim();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers ?? {});
  Object.entries(getAuthHeaders()).forEach(([key, value]) => {
    headers.set(key, value);
  });
  return fetch(`${API_BASE}${path}`, { ...options, headers });
}

async function readJsonSafe(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function setStatus(text, success = true) {
  systemStatus.textContent = text;
  systemStatus.style.background = success ? "var(--green-700)" : "var(--brown-700)";
}

function renderMessage(text, who, sources = []) {
  const bubble = document.createElement("div");
  bubble.className = `message ${who}`;

  const body = document.createElement("div");
  body.className = "message-body";
  body.textContent = text;
  bubble.appendChild(body);

  if (who === "bot" && Array.isArray(sources) && sources.length > 0) {
    const list = document.createElement("ul");
    list.className = "source-list";
    sources.forEach((source) => {
      const item = document.createElement("li");
      const label = `${source.source} (chunk ${source.chunkIndex}, score ${source.score})`;
      item.textContent = source.excerpt ? `${label}: ${source.excerpt}` : label;
      list.appendChild(item);
    });
    bubble.appendChild(list);
  }

  chatWindow.appendChild(bubble);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function getSelectedFiles() {
  return Array.from(fileInput.files ?? []);
}

function renderSelectedFiles() {
  const files = getSelectedFiles();
  if (files.length === 0) {
    selectedFiles.textContent = "Nenhum arquivo selecionado.";
    selectedFiles.classList.add("is-empty");
    ingestBtn.disabled = true;
    reindexBtn.disabled = true;
    return;
  }

  const names = files.map((file) => file.name);
  selectedFiles.textContent = `Selecionados (${files.length}): ${names.join(", ")}`;
  selectedFiles.classList.remove("is-empty");
  ingestBtn.disabled = false;
  reindexBtn.disabled = false;
}

function validateUploadFiles(files) {
  const oversizedFile = files.find((file) => file.size > MAX_UPLOAD_BYTES);
  if (oversizedFile) {
    const maxMb = (MAX_UPLOAD_BYTES / (1024 * 1024)).toFixed(0);
    return `Arquivo "${oversizedFile.name}" excede o limite de ${maxMb}MB da Vercel.`;
  }
  return "";
}

function clearSelectedFiles() {
  fileInput.value = "";
  renderSelectedFiles();
}

function renderFileAlert() {
  if (indexedFiles.length === 0) {
    fileAlert.textContent = "Nenhum documento indexado ainda.";
    fileAlert.classList.add("is-warning");
    fileSelect.disabled = true;
    deleteFileBtn.disabled = true;
    return;
  }

  fileAlert.textContent = `Arquivos indexados: ${indexedFiles.length}.`;
  fileAlert.classList.remove("is-warning");
  fileSelect.disabled = false;
  deleteFileBtn.disabled = !activeFile;
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
  const dataTransfer = new DataTransfer();
  files.forEach((file) => dataTransfer.items.add(file));
  fileInput.files = dataTransfer.files;
  renderSelectedFiles();
});

fileInput.addEventListener("change", () => {
  renderSelectedFiles();
});

async function sendIngest(mode) {
  const files = getSelectedFiles();
  ingestFeedback.textContent = "";

  if (files.length === 0) {
    ingestFeedback.textContent = "Selecione pelo menos um arquivo.";
    return;
  }

  const sizeError = validateUploadFiles(files);
  if (sizeError) {
    ingestFeedback.textContent = sizeError;
    setStatus("Upload bloqueado por tamanho", false);
    return;
  }

  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  try {
    setStatus(mode === "reindex" ? "Reindexando base..." : "Indexando documentos...");
    ingestBtn.disabled = true;
    reindexBtn.disabled = true;

    const endpoint = mode === "reindex" ? "/reindex" : "/ingest";
    const response = await apiFetch(endpoint, {
      method: "POST",
      body: formData,
    });

    const data = await readJsonSafe(response);
    if (!response.ok) throw new Error(data.error ?? "Erro ao indexar");

    await loadIndexedFiles();
    clearSelectedFiles();

    ingestFeedback.textContent =
      mode === "reindex"
        ? `Base reindexada com ${data.indexed} arquivo(s).`
        : `Indexados ${data.indexed} arquivo(s).`;
    setStatus("Memoria atualizada");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha na indexacao";
    ingestFeedback.textContent = message;
    setStatus("Erro na indexacao", false);
  } finally {
    renderSelectedFiles();
  }
}

ingestBtn.addEventListener("click", async () => {
  await sendIngest("append");
});

reindexBtn.addEventListener("click", async () => {
  await sendIngest("reindex");
});

fileSelect.addEventListener("change", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLSelectElement)) return;
  updateFileSelection(target.value);
});

deleteFileBtn.addEventListener("click", async () => {
  ingestFeedback.textContent = "";
  if (!activeFile) {
    ingestFeedback.textContent = "Selecione um arquivo para excluir.";
    return;
  }

  try {
    deleteFileBtn.disabled = true;
    setStatus("Excluindo arquivo...");

    const response = await apiFetch("/files", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: activeFile }),
    });
    const data = await readJsonSafe(response);
    if (!response.ok) throw new Error(data.error ?? "Erro ao excluir arquivo");

    await loadIndexedFiles();
    ingestFeedback.textContent = `Arquivo removido: ${activeFile}`;
    setStatus("Memoria atualizada");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao excluir";
    ingestFeedback.textContent = message;
    setStatus("Erro na manutencao", false);
  } finally {
    deleteFileBtn.disabled = false;
  }
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
    const response = await apiFetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        topK: DEFAULT_TOP_K,
        fileName: activeFile || undefined,
      }),
    });

    const data = await readJsonSafe(response);
    if (!response.ok) throw new Error(data.error ?? "Erro no chat");

    renderMessage(data.answer ?? "Sem resposta.", "bot", data.sources ?? []);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao conversar";
    renderMessage(message, "bot");
  } finally {
    askBtn.disabled = false;
  }
});

async function loadIndexedFiles() {
  try {
    const response = await apiFetch("/files");
    const data = await readJsonSafe(response);
    if (response.ok) {
      indexedFiles.length = 0;
      indexedFiles.push(...(data.files ?? []));
      updateFileSelection(activeFile || indexedFiles[0] || "");
      return;
    }
    const message = data.error ?? "Falha ao carregar arquivos indexados.";
    ingestFeedback.textContent = message;
    setStatus("Persistencia indisponivel", false);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao carregar arquivos.";
    ingestFeedback.textContent = message;
    setStatus("Erro ao carregar arquivos", false);
  }
}

renderFileAlert();
renderSelectedFiles();
loadIndexedFiles();

questionInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    askBtn.click();
  }
});

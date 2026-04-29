/**
 * Dashboard JavaScript
 * Tabungan Mimpiku
 */
const duitSound = new Audio("/sounds/kaching.mp3");
const sultanSound = new Audio("/sounds/sultan.mp3");
// Global Variables
let currentTargetId = null;
let targetToDelete = null;
let targetsData = [];

// DOM Elements
const uploadArea = document.getElementById("uploadArea");
const gambarInput = document.getElementById("gambarInput");
const uploadPreview = document.getElementById("uploadPreview");
const uploadRemove = document.getElementById("uploadRemove");
const addTargetForm = document.getElementById("addTargetForm");
const modalOverlay = document.getElementById("modalOverlay");
const deleteModalOverlay = document.getElementById("deleteModalOverlay");

// ============================================
// NUMBER FORMATTING UTILITIES
// ============================================

// Format number with commas (e.g., 15000000 -> 15,000,000)
function formatNumberWithCommas(value) {
  if (!value || value === "") return "";
  const cleanValue = value.toString().replace(/[^\d]/g, "");
  if (cleanValue === "") return "";
  return cleanValue.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Remove commas from formatted number
function removeCommas(value) {
  if (!value) return "0";
  return value.toString().replace(/,/g, "");
}

// Parse number from formatted input
function parseFormattedNumber(value) {
  const cleanValue = removeCommas(value);
  return parseInt(cleanValue) || 0;
}

// Setup number input formatting
function setupNumberInput(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;

  input.addEventListener("input", function (e) {
    let value = this.value;
    let cursorPos = this.selectionStart;

    const commasBefore = (value.substring(0, cursorPos).match(/,/g) || [])
      .length;

    const cleanValue = value.replace(/[^\d]/g, "");
    const formatted = formatNumberWithCommas(cleanValue);

    this.value = formatted;

    let newCursorPos = cursorPos;
    const newCommasBefore = (
      formatted.substring(0, cursorPos).match(/,/g) || []
    ).length;
    const commaDiff = newCommasBefore - commasBefore;
    newCursorPos += commaDiff;

    if (newCursorPos < 0) newCursorPos = 0;
    if (newCursorPos > formatted.length) newCursorPos = formatted.length;

    this.setSelectionRange(newCursorPos, newCursorPos);
  });
}

// ============================================
// UPLOAD HANDLERS
// ============================================

uploadArea.addEventListener("click", (e) => {
  if (e.target !== uploadRemove && !uploadRemove.contains(e.target)) {
    gambarInput.click();
  }
});

gambarInput.addEventListener("change", handleFileSelect);

uploadArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadArea.classList.add("dragover");
});

uploadArea.addEventListener("dragleave", () => {
  uploadArea.classList.remove("dragover");
});

uploadArea.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadArea.classList.remove("dragover");

  const files = e.dataTransfer.files;
  if (files.length > 0) {
    gambarInput.files = files;
    handleFileSelect({ target: gambarInput });
  }
});

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) {
    if (!file.type.startsWith("image/")) {
      showToast("error", "Hanya file gambar yang diizinkan");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      uploadPreview.src = e.target.result;
      uploadPreview.classList.add("active");
      uploadRemove.classList.add("active");
    };
    reader.readAsDataURL(file);
  }
}

uploadRemove.addEventListener("click", (e) => {
  e.stopPropagation();
  gambarInput.value = "";
  uploadPreview.src = "";
  uploadPreview.classList.remove("active");
  uploadRemove.classList.remove("active");
});

// ============================================
// FORM SUBMISSION
// ============================================

addTargetForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const submitBtn = document.getElementById("submitBtn");

  const namaBarang = document.getElementById("namaBarang").value.trim();
  const targetRaw = document.getElementById("target").value;
  const tipe = document.getElementById("tipe").value;
  const perPeriodeRaw = document.getElementById("perPeriode").value;

  const target = parseFormattedNumber(targetRaw);
  const perPeriode = parseFormattedNumber(perPeriodeRaw);

  if (!namaBarang || target <= 0 || !tipe || perPeriode <= 0) {
    showToast("error", "Semua field wajib diisi dengan benar");
    return;
  }

  const formData = new FormData();
  formData.append("namaBarang", namaBarang);
  formData.append("target", target);
  formData.append("tipe", tipe);
  formData.append("perPeriode", perPeriode);

  if (gambarInput.files[0]) {
    formData.append("gambar", gambarInput.files[0]);
  }

  submitBtn.innerHTML = '<div class="spinner"></div> Menyimpan...';
  submitBtn.disabled = true;

  try {
    const token = localStorage.getItem("token");
    const response = await fetch("/api/targets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (response.ok) {
      showToast("success", "Target tabungan berhasil dibuat!");
      addTargetForm.reset();
      uploadPreview.src = "";
      uploadPreview.classList.remove("active");
      uploadRemove.classList.remove("active");
      loadTargets();
    } else {
      showToast("error", data.message || "Gagal membuat target");
    }
  } catch (error) {
    console.error("Create target error:", error);
    showToast("error", "Terjadi kesalahan. Silakan coba lagi.");
  } finally {
    submitBtn.innerHTML = "Tambahkan Target Tabungan";
    submitBtn.disabled = false;
  }
});

// ============================================
// TAB NAVIGATION
// ============================================

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".tab-btn")
      .forEach((b) => b.classList.remove("active"));
    document
      .querySelectorAll(".tab-panel")
      .forEach((p) => p.classList.remove("active"));

    btn.classList.add("active");
    const tabId = btn.dataset.tab;
    document.getElementById(`tab-${tabId}`).classList.add("active");
  });
});

// ============================================
// LOAD TARGETS
// ============================================

async function loadTargets() {
  try {
    const token = localStorage.getItem("token");
    const response = await fetch("/api/targets", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        logout();
        return;
      }
      throw new Error("Failed to load targets");
    }

    targetsData = await response.json();
    renderTargets();
    updateBadges();
  } catch (error) {
    console.error("Load targets error:", error);
    showToast("error", "Gagal memuat data tabungan");
  }
}

// ============================================
// RENDER TARGETS
// ============================================

function renderTargets() {
  const aktifContainer = document.getElementById("targetsAktif");
  const selesaiContainer = document.getElementById("targetsSelesai");

  const aktifTargets = targetsData.filter((t) => t.status === "aktif");
  const selesaiTargets = targetsData.filter((t) => t.status === "selesai");

  aktifContainer.innerHTML =
    aktifTargets.length > 0
      ? aktifTargets.map((target) => createTargetCard(target)).join("")
      : createEmptyState(
          "Belum ada target tabungan",
          "Mulai buat target tabungan pertamamu!",
        );

  selesaiContainer.innerHTML =
    selesaiTargets.length > 0
      ? selesaiTargets.map((target) => createTargetCard(target)).join("")
      : createEmptyState(
          "Belum ada target yang tercapai",
          "Terus menabung untuk mencapai targetmu!",
        );
}

function createTargetCard(target) {
  const isCompleted = target.status === "selesai";
  const progress = Math.min(target.progress, 100);
  const sisa = target.target - target.totalTabungan;

  let estimasiText = "-";

  if (isCompleted) {
    estimasiText = "Tercapai!";
  } else if (target.perPeriode > 0 && sisa > 0) {
    const totalPeriode = Math.ceil(sisa / target.perPeriode);

    switch (target.tipe) {
      case "Harian":
        estimasiText =
          totalPeriode <= 1 ? "Hari ini!" : `~${totalPeriode} hari lagi`;
        break;

      case "Mingguan":
        estimasiText =
          totalPeriode <= 1 ? "Minggu ini!" : `~${totalPeriode} minggu lagi`;
        break;

      case "Bulanan":
        estimasiText =
          totalPeriode <= 1 ? "Bulan ini!" : `~${totalPeriode} bulan lagi`;
        break;

      default:
        estimasiText = "-";
    }
  }
  const imageHtml = target.gambar
    ? `<img src="${target.gambar}" alt="${target.namaBarang}" class="target-image">`
    : `<div class="target-image-placeholder">${target.namaBarang.charAt(0).toUpperCase()}</div>`;

  const badgeHtml = isCompleted
    ? '<span class="badge badge-success">Selesai</span>'
    : "";

  const actionsHtml = isCompleted
    ? `<div class="target-actions">
        <button class="btn btn-danger btn-sm" onclick="showDeleteModal('${target._id}')">Hapus</button>
      </div>`
    : `<div class="target-actions">
        <button class="btn btn-primary btn-sm" onclick="showTambahModal('${target._id}')">Tambah Tabungan</button>
        <button class="btn btn-success btn-sm" onclick="tandaiSelesai('${target._id}')">Tandai Selesai</button>
      </div>`;

  return `
    <div class="target-card ${isCompleted ? "completed" : ""}" data-id="${target._id}">
      ${imageHtml}
      <div class="target-content">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
          <h3 class="target-name" title="${target.namaBarang}">${target.namaBarang}</h3>
          ${badgeHtml}
        </div>
        <p class="target-amount">
          Target: <strong>${formatRupiah(target.target)}</strong>
        </p>
        
        <div class="progress-container">
          <div class="progress-header">
            <span class="progress-label">${formatRupiah(target.totalTabungan)} tersimpan</span>
            <span class="progress-value">${progress}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progress}%"></div>
          </div>
        </div>
        
        <div class="target-stats">
          <div class="stat-item">
            <div class="stat-value">${formatRupiah(target.perPeriode)}</div>
            <div class="stat-label">${target.tipe}</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${estimasiText}</div>
            <div class="stat-label">Estimasi</div>
          </div>
        </div>
        
        ${actionsHtml}
      </div>
    </div>
  `;
}

function createEmptyState(title, text) {
  return `
    <div class="empty-state" style="grid-column: 1 / -1;">
      <div class="empty-icon">💰</div>
      <h3 class="empty-title">${title}</h3>
      <p class="empty-text">${text}</p>
    </div>
  `;
}

function updateBadges() {
  const aktifCount = targetsData.filter((t) => t.status === "aktif").length;
  const selesaiCount = targetsData.filter((t) => t.status === "selesai").length;

  document.getElementById("badgeAktif").textContent = aktifCount;
  document.getElementById("badgeSelesai").textContent = selesaiCount;
}

// ============================================
// MODAL FUNCTIONS
// ============================================

function showTambahModal(targetId) {
  currentTargetId = targetId;
  document.getElementById("tambahanInput").value = "";
  modalOverlay.classList.add("active");
}

function closeModal() {
  modalOverlay.classList.remove("active");
  currentTargetId = null;
}

function showDeleteModal(targetId) {
  targetToDelete = targetId;
  deleteModalOverlay.classList.add("active");
}

function closeDeleteModal() {
  deleteModalOverlay.classList.remove("active");
  targetToDelete = null;
}

modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeModal();
});

deleteModalOverlay.addEventListener("click", (e) => {
  if (e.target === deleteModalOverlay) closeDeleteModal();
});

// ============================================
// ACTIONS
// ============================================
async function confirmTambahTabungan() {
  const tambahanRaw = document.getElementById("tambahanInput").value;
  const tambahan = parseFormattedNumber(tambahanRaw);

  if (!tambahan || tambahan < 1) {
    showToast("error", "Jumlah tabungan harus lebih dari 0");
    return;
  }

  try {
    const token = localStorage.getItem("token");
    const response = await fetch(`/api/targets/${currentTargetId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ tambahan }),
    });

    const data = await response.json();

    if (response.ok) {
      showToast("success", "Tabungan berhasil ditambahkan!");

      let soundToPlay = tambahan >= 100000 ? sultanSound : duitSound;

      soundToPlay.pause();
      soundToPlay.currentTime = 0;
      soundToPlay.play().catch(() => {});

      if (navigator.vibrate) {
        navigator.vibrate(tambahan >= 100000 ? [200, 100, 200] : 100);
      }

      closeModal();
      loadTargets();
    } else {
      showToast("error", data.message || "Gagal menambahkan tabungan");
    }
  } catch (error) {
    console.error("Tambah tabungan error:", error);
    showToast("error", "Terjadi kesalahan. Silakan coba lagi.");
  }
}

async function tandaiSelesai(targetId) {
  try {
    const token = localStorage.getItem("token");
    const response = await fetch(`/api/targets/${targetId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ tandaiSelesai: true }),
    });

    const data = await response.json();

    if (response.ok) {
      showToast("success", "Selamat! Target tabungan telah tercapai!");
      loadTargets();
    } else {
      showToast("error", data.message || "Gagal menandai selesai");
    }
  } catch (error) {
    console.error("Tandai selesai error:", error);
    showToast("error", "Terjadi kesalahan. Silakan coba lagi.");
  }
}

async function confirmDelete() {
  try {
    const token = localStorage.getItem("token");
    const response = await fetch(`/api/targets/${targetToDelete}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();

    if (response.ok) {
      showToast("success", "Target berhasil dihapus");
      closeDeleteModal();
      loadTargets();
    } else {
      showToast("error", data.message || "Gagal menghapus target");
    }
  } catch (error) {
    console.error("Delete target error:", error);
    showToast("error", "Terjadi kesalahan. Silakan coba lagi.");
  }
}
if (target.progress === 100) {
  alert("🏆 Achievement Unlocked: Target Selesai!");
}
// ============================================
// INITIALIZE
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  setupNumberInput("target");
  setupNumberInput("perPeriode");
  setupNumberInput("tambahanInput");

  loadTargets();
});

const btn = document.getElementById("toggleTheme");

btn.addEventListener("click", () => {
  document.body.classList.toggle("dark");

  if (document.body.classList.contains("dark")) {
    btn.textContent = "☀️";
    localStorage.setItem("theme", "dark");
  } else {
    btn.textContent = "🌙";
    localStorage.setItem("theme", "light");
  }
});

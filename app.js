// Configuración de Supabase
const SUPABASE_URL = "https://tu-supabase-id.supabase.co"; 
const SUPABASE_ANON_KEY = "tu-supabase-anon-key";
const supabaseClient = typeof supabase !== 'undefined' ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// Helper DOM
const $ = (id) => document.getElementById(id);

let currentUser = null;
let userProfile = { calorieGoal: 2000, apiKey: "" };
let fastingInterval = null;
let fastingStartTime = null;
let myChart = null;

// Inicialización
document.addEventListener("DOMContentLoaded", () => {
    initDatePicker();
    setupEventListeners();
    checkAuth();
    loadSettings();
});

function initDatePicker() {
    const today = new Date().toISOString().split("T")[0];
    const picker = $("datePicker");
    if (picker) {
        picker.value = today;
        picker.addEventListener("change", updateEverything);
    }
}

function getSelectedDate() {
    return $("datePicker")?.value || new Date().toISOString().split("T")[0];
}

function formatDate(dateStr) {
    const date = new Date(dateStr + "T12:00:00");
    return date.toLocaleDateString("es-ES", { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function setupEventListeners() {
    $("openSettingsBtn")?.addEventListener("click", () => $("settingsModal").style.display = "flex");
    $("closeSettingsBtn")?.addEventListener("click", () => $("settingsModal").style.display = "none");
    $("saveSettingsBtn")?.addEventListener("click", saveSettings);
    $("toggleThemeBtn")?.addEventListener("click", toggleTheme);
    
    $("gymToggleBtn")?.addEventListener("click", () => {
        const btn = $("gymToggleBtn");
        const active = btn.dataset.active === "true";
        btn.dataset.active = !active;
        btn.textContent = !active ? "🏋️ Gimnasio: SÍ" : "🏋️ Gimnasio: NO";
        btn.classList.toggle("btn-primary", !active);
        autoSave();
    });

    $("runToggleBtn")?.addEventListener("click", () => {
        const btn = $("runToggleBtn");
        const active = btn.dataset.active === "true";
        btn.dataset.active = !active;
        btn.textContent = !active ? "🏃 Carrera: SÍ" : "🏃 Carrera: NO";
        btn.classList.toggle("btn-primary", !active);
        autoSave();
    });

    $("fastingStartBtn")?.addEventListener("click", startFasting);
    $("fastingStopBtn")?.addEventListener("click", stopFasting);
    $("statsFilter")?.addEventListener("change", loadAdvancedStats);

    // Guardado automático en inputs
    const inputs = document.querySelectorAll("textarea, input[type='number']");
    inputs.forEach(input => input.addEventListener("input", debounce(autoSave, 800)));
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Configuración y Usuarios
function loadSettings() {
    const stored = localStorage.getItem("userProfile");
    if (stored) {
        userProfile = JSON.parse(stored);
        if ($("goalCaloriesInput")) $("goalCaloriesInput").value = userProfile.calorieGoal || 2000;
        if ($("apiKeyInput")) $("apiKeyInput").value = userProfile.apiKey || "";
    }
}

function saveSettings() {
    userProfile.calorieGoal = parseInt($("goalCaloriesInput")?.value || "2000", 10);
    userProfile.apiKey = $("apiKeyInput")?.value.trim() || "";
    localStorage.setItem("userProfile", JSON.stringify(userProfile));
    $("settingsModal").style.display = "none";
    showToast("⚙️ Configuración guardada");
    updateSummary();
}

function getActiveApiKey() {
    return userProfile.apiKey || "";
}

// Lógica de Estimación IA con Gemini
async function estimateCaloriesAI(mealId) {
    const textInput = $(`${mealId}Text`);
    const calInput = $(`${mealId}Cal`);
    const description = textInput?.value.trim();

    if (!description) {
        alert("Escribí qué comiste primero para poder estimar las calorías.");
        return;
    }

    const activeApiKey = getActiveApiKey();
    if (!activeApiKey) {
        alert("Debes ingresar tu Gemini API Key en el menú de Configuración.");
        return;
    }

    showToast("✨ Consultando a la IA...");

    const availableModels = [
        "gemini-1.5-flash",
        "gemini-1.5-pro"
    ];

    const prompt = `Analiza la siguiente comida y devuelve ÚNICAMENTE un número entero estimado que represente el total de calorías (kcal). No agregues texto ni unidades. Comida: "${description}"`;

    let success = false;

    for (const model of availableModels) {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(activeApiKey)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });

            const result = await response.json();

            if (response.ok && result.candidates && result.candidates[0]?.content?.parts[0]?.text) {
                const responseText = result.candidates[0].content.parts[0].text.trim();
                const estimatedCalories = parseInt(responseText.replace(/\D/g, ''), 10);

                if (!isNaN(estimatedCalories)) {
                    calInput.value = estimatedCalories;
                    updateSummary();
                    autoSave();
                    showToast(`✨ Estimación: ${estimatedCalories} kcal`);
                    success = true;
                    break;
                }
            }
        } catch (err) {
            console.warn(`Error con ${model}:`, err);
        }
    }

    if (!success) {
        showToast("❌ Error: Verificá tu API Key o conexión");
    }
}

// Cálculo y Resumen
function calculateCalories(data) {
    if (!data) return 0;
    return (parseInt(data.breakfastCal || 0, 10) +
            parseInt(data.lunchCal || 0, 10) +
            parseInt(data.snackCal || 0, 10) +
            parseInt(data.dinnerCal || 0, 10) +
            parseInt(data.othersCal || 0, 10));
}

function updateSummary() {
    const currentData = collectFormData();
    const total = calculateCalories(currentData);
    const goal = userProfile.calorieGoal || 2000;
    const percentage = Math.round((total / goal) * 100);

    if ($("totalCalories")) $("totalCalories").textContent = `${total} kcal`;
    if ($("calorieGoalDisplay")) $("calorieGoalDisplay").textContent = `${goal} kcal`;
    if ($("calorieProgress")) $("calorieProgress").textContent = `${percentage}%`;
}

function collectFormData() {
    return {
        breakfastText: $("breakfastText")?.value || "",
        breakfastCal: $("breakfastCal")?.value || "",
        lunchText: $("lunchText")?.value || "",
        lunchCal: $("lunchCal")?.value || "",
        snackText: $("snackText")?.value || "",
        snackCal: $("snackCal")?.value || "",
        dinnerText: $("dinnerText")?.value || "",
        dinnerCal: $("dinnerCal")?.value || "",
        othersText: $("othersText")?.value || "",
        othersCal: $("othersCal")?.value || "",
        gym: $("gymToggleBtn")?.dataset.active === "true",
        gymDuration: $("gymDuration")?.value || "",
        running: $("runToggleBtn")?.dataset.active === "true",
        runningKm: $("runKm")?.value || "",
        runningDuration: $("runDuration")?.value || "",
        activityNotes: $("activityNotes")?.value || ""
    };
}

// Ayuno Intermitente
function startFasting() {
    fastingStartTime = new Date();
    localStorage.setItem("fastingStartTime", fastingStartTime.toISOString());
    updateFastingUI(true);
}

function stopFasting() {
    fastingStartTime = null;
    localStorage.removeItem("fastingStartTime");
    clearInterval(fastingInterval);
    updateFastingUI(false);
}

function updateFastingUI(isFasting) {
    if (isFasting) {
        if ($("fastingStartBtn")) $("fastingStartBtn").style.display = "none";
        if ($("fastingStopBtn")) $("fastingStopBtn").style.display = "inline-block";
        fastingInterval = setInterval(renderFastingTimer, 1000);
    } else {
        if ($("fastingStartBtn")) $("fastingStartBtn").style.display = "inline-block";
        if ($("fastingStopBtn")) $("fastingStopBtn").style.display = "none";
        if ($("fastingDisplay")) $("fastingDisplay").textContent = "Tiempo de ayuno: 00:00:00";
    }
}

function renderFastingTimer() {
    if (!fastingStartTime) return;
    const diff = Math.floor((new Date() - new Date(fastingStartTime)) / 1000);
    const hrs = String(Math.floor(diff / 3600)).padStart(2, "0");
    const mins = String(Math.floor((diff % 3600) / 60)).padStart(2, "0");
    const secs = String(diff % 60).padStart(2, "0");
    if ($("fastingDisplay")) $("fastingDisplay").textContent = `Tiempo de ayuno: ${hrs}:${mins}:${secs}`;
}

function updateFasting() {
    const savedTime = localStorage.getItem("fastingStartTime");
    if (savedTime) {
        fastingStartTime = new Date(savedTime);
        updateFastingUI(true);
    } else {
        updateFastingUI(false);
    }
}

// Estadísticas Avanzadas (Chart.js)
async function loadAdvancedStats() {
    if (!currentUser && !supabaseClient) return;

    const days = parseInt($("statsFilter")?.value || "7", 10);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));
    const startDateStr = startDate.toISOString().split('T')[0];

    let rows = [];
    if (supabaseClient && currentUser) {
        const { data } = await supabaseClient
            .from('registros')
            .select('date, data')
            .eq('user_id', currentUser.id)
            .gte('date', startDateStr)
            .order('date', { ascending: true });
        rows = data || [];
    }

    const labels = [];
    const calorieData = [];
    let totalCal = 0;
    let gymDays = 0;
    let totalKm = 0;

    rows.forEach(r => {
        const dateObj = new Date(r.date + "T12:00:00");
        labels.push(dateObj.toLocaleDateString("es-ES", { day: "numeric", month: "short" }));
        
        const cal = calculateCalories(r.data);
        calorieData.push(cal);
        totalCal += cal;

        if (r.data?.gym) gymDays++;
        if (r.data?.runningKm) totalKm += parseFloat(r.data.runningKm);
    });

    const count = rows.length;
    if ($("avgCalories")) $("avgCalories").textContent = count > 0 ? `${Math.round(totalCal / count)} kcal` : "0 kcal";
    if ($("totalGymDays")) $("totalGymDays").textContent = `${gymDays} días`;
    if ($("totalKmRun")) $("totalKmRun").textContent = `${totalKm.toFixed(1)} km`;

    const ctx = document.getElementById('statsChart')?.getContext('2d');
    if (!ctx) return;

    if (myChart) myChart.destroy();

    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels.length ? labels : ["Sin datos"],
            datasets: [{
                label: 'Calorías (kcal)',
                data: calorieData.length ? calorieData : [0],
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.2)',
                fill: true,
                tension: 0.3,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } }
        }
    });
}

// Persistencia y Actualización General
async function autoSave() {
    showToast("💾 Guardando...");
    updateSummary();
}

function updateEverything() {
    if ($("prettyDate")) $("prettyDate").textContent = formatDate(getSelectedDate());
    updateSummary();
    updateFasting();
    loadAdvancedStats();
}

function toggleTheme() {
    const current = document.body.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.body.setAttribute("data-theme", next);
    if ($("toggleThemeBtn")) $("toggleThemeBtn").textContent = next === "dark" ? "☀️" : "🌙";
}

function showToast(msg) {
    const toast = $("toast");
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2000);
}

function checkAuth() {
    currentUser = { id: "demo-user" }; // Simulación activa
    updateEverything();
}
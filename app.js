/* =========================================================
   MI REGISTRO — APP.JS (SUPABASE + AUTHENTICATION)
   ========================================================= */

const SUPABASE_URL = "https://xmjkzjvfpbsyypxbeixb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhtamt6anZmcGJzeXlweGJlaXhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxMDI3MDksImV4cCI6MjEwMjY3ODcwOX0.VaTYKIICuzFXgVHWj-Rzvx2sQ9Fpr5eOdXh0c1XnMZA";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DEFAULT_CALORIE_GOAL = 2000;
const FASTING_GOAL = 16;
let currentProfile = null;
let currentUser = null;
let isSignUpMode = false;

const meals = [
    { id: "breakfast", name: "Desayuno", icon: "🌅" },
    { id: "lunch", name: "Almuerzo", icon: "🥗" },
    { id: "snack", name: "Merienda", icon: "☕" },
    { id: "dinner", name: "Cena", icon: "🍽️" },
    { id: "other", name: "Otros", icon: "🍎" }
];

function $(id) { return document.getElementById(id); }

function today() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getSelectedDate() { return $("date")?.value || today(); }

function formatDate(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString + "T12:00:00");
    return date.toLocaleDateString("es-UY", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function emptyRecord() {
    return {
        breakfast: "", breakfastCal: 0, lunch: "", lunchCal: 0,
        snack: "", snackCal: 0, dinner: "", dinnerCal: 0,
        other: "", otherCal: 0, gym: false, gymMinutes: 0,
        running: false, runningKm: 0, runningMinutes: 0,
        activityNotes: "", fastingStart: "", fastingEnd: ""
    };
}

/* ---------------------------------------------------------
   AUTENTICACIÓN Y SESIONES
   --------------------------------------------------------- */

function setupAuth() {
    $("authForm")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const userInput = $("authEmail").value.trim().toLowerCase();
        const password = $("authPassword").value;
        const errorMsg = $("authError");
        errorMsg.textContent = "";

        // Usamos @gmail.com internamente para cumplir con el formato de Supabase
        const email = userInput.includes('@') ? userInput : `${userInput}@gmail.com`;

        if (isSignUpMode) {
            const { data, error } = await supabaseClient.auth.signUp({ email, password });
            if (error) {
                errorMsg.textContent = "❌ " + error.message;
            } else {
                alert("¡Usuario creado con éxito! Ya podés iniciar sesión.");
                toggleAuthMode();
            }
        } else {
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) {
                errorMsg.textContent = "❌ " + error.message;
            }
        }
    });

    $("btnToggleAuthMode")?.addEventListener("click", toggleAuthMode);

    $("logoutBtn")?.addEventListener("click", async () => {
        await supabaseClient.auth.signOut();
    });

    // Escuchar cambios de sesión en tiempo real
    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (session) {
            currentUser = session.user;
            $("authModal").style.display = "none";
            $("appContainer").style.display = "flex";
            
            // Muestra solo el nombre de usuario limpio en la barra
            const cleanUser = currentUser.email.split('@')[0];
            $("userEmailBadge").textContent = `👤 ${cleanUser}`;
            
            loadAppContent();
        } else {
            currentUser = null;
            $("authModal").style.display = "flex";
            $("appContainer").style.display = "none";
        }
    });
}

function toggleAuthMode() {
    isSignUpMode = !isSignUpMode;
    $("authTitle").textContent = isSignUpMode ? "📝 Crear Cuenta" : "🔑 Iniciar Sesión";
    $("authSubmitBtn").textContent = isSignUpMode ? "Registrarse" : "Entrar";
    $("authToggleText").textContent = isSignUpMode ? "¿Ya tenés cuenta?" : "¿No tenés cuenta?";
    $("btnToggleAuthMode").textContent = isSignUpMode ? "Iniciá sesión" : "Registrate acá";
    $("authError").textContent = "";
}

/* ---------------------------------------------------------
   OPERACIONES EN SUPABASE
   --------------------------------------------------------- */

async function saveDayCloud() {
    if (!currentUser) return;
    const date = getSelectedDate();
    const data = getFormData();

    const { error } = await supabaseClient
        .from('registros')
        .upsert({ date: date, data: data, user_id: currentUser.id }, { onConflict: 'date,user_id' });

    if (error) {
        console.error("Error al guardar:", error);
        showToast("❌ Error al guardar");
    } else {
        showToast("⚡ Guardado en Supabase");
        updateEverything();
    }
}

async function loadRecord() {
    if (!currentUser) return;
    const date = getSelectedDate();

    const { data } = await supabaseClient
        .from('registros')
        .select('data')
        .eq('date', date)
        .eq('user_id', currentUser.id)
        .maybeSingle();

    const record = (data && data.data) ? data.data : emptyRecord();

    meals.forEach(m => {
        if ($(`${m.id}Text`)) $(`${m.id}Text`).value = record[m.id] || "";
        if ($(`${m.id}Cal`)) $(`${m.id}Cal`).value = record[m.id + "Cal"] || "";
    });

    if ($("gymMinutes")) $("gymMinutes").value = record.gymMinutes || "";
    if ($("runningKm")) $("runningKm").value = record.runningKm || "";
    if ($("runningMinutes")) $("runningMinutes").value = record.runningMinutes || "";
    if ($("activityNotes")) $("activityNotes").value = record.activityNotes || "";
    if ($("fastingStart")) $("fastingStart").value = record.fastingStart || "";
    if ($("fastingEnd")) $("fastingEnd").value = record.fastingEnd || "";

    updateActivityButton($("gymButton"), record.gym);
    updateActivityButton($("runButton"), record.running);

    updateEverything();
}

async function clearDay() {
    if (!currentUser || !confirm("¿Querés eliminar los datos de este día?")) return;

    const date = getSelectedDate();
    const { error } = await supabaseClient
        .from('registros')
        .delete()
        .eq('date', date)
        .eq('user_id', currentUser.id);

    if (error) {
        showToast("❌ Error al borrar");
    } else {
        showToast("Día eliminado");
        loadRecord();
    }
}

async function fetchUserProfile() {
    if (!currentUser) return;

    const { data } = await supabaseClient
        .from('perfil')
        .select('data')
        .eq('id', currentUser.id)
        .maybeSingle();

    if (data && data.data) {
        currentProfile = data.data;
        if (currentProfile.weight) $("userWeight").value = currentProfile.weight;
        if (currentProfile.height) $("userHeight").value = currentProfile.height;
        if (currentProfile.age) $("userAge").value = currentProfile.age;
        if (currentProfile.gender) $("userGender").value = currentProfile.gender;
        if (currentProfile.activity) $("userActivity").value = currentProfile.activity;
        if (currentProfile.isManual && currentProfile.goal) $("userManualGoal").value = currentProfile.goal;

        const badge = $("profileStatusBadge");
        if (badge) badge.textContent = currentProfile.isManual ? "Meta Manual" : "Meta Sugerida";
    }
}

async function saveUserProfileCloud(profileData) {
    if (!currentUser) return;
    currentProfile = profileData;

    const { error } = await supabaseClient
        .from('perfil')
        .upsert({ id: currentUser.id, data: profileData }, { onConflict: 'id' });

    if (!error) {
        showToast("⚡ Perfil guardado");
        fetchUserProfile();
        updateEverything();
    }
}

/* ---------------------------------------------------------
   HELPERS CÁLCULOS E INTERFAZ
   --------------------------------------------------------- */

function getFormData() {
    return {
        breakfast: $("breakfastText")?.value || "",
        breakfastCal: Number($("breakfastCal")?.value || 0),
        lunch: $("lunchText")?.value || "",
        lunchCal: Number($("lunchCal")?.value || 0),
        snack: $("snackText")?.value || "",
        snackCal: Number($("snackCal")?.value || 0),
        dinner: $("dinnerText")?.value || "",
        dinnerCal: Number($("dinnerCal")?.value || 0),
        other: $("otherText")?.value || "",
        otherCal: Number($("otherCal")?.value || 0),
        gym: $("gymButton")?.classList.contains("active") || false,
        gymMinutes: Number($("gymMinutes")?.value || 0),
        running: $("runButton")?.classList.contains("active") || false,
        runningKm: Number($("runningKm")?.value || 0),
        runningMinutes: Number($("runningMinutes")?.value || 0),
        activityNotes: $("activityNotes")?.value || "",
        fastingStart: $("fastingStart")?.value || "",
        fastingEnd: $("fastingEnd")?.value || ""
    };
}

function calculateCalories(record) {
    return Number(record.breakfastCal||0) + Number(record.lunchCal||0) + Number(record.snackCal||0) + Number(record.dinnerCal||0) + Number(record.otherCal||0);
}

function calculateFastingMinutes(record) {
    if (!record.fastingStart || !record.fastingEnd) return null;
    const startParts = record.fastingStart.split(":").map(Number);
    const endParts = record.fastingEnd.split(":").map(Number);
    let start = startParts[0] * 60 + startParts[1];
    let end = endParts[0] * 60 + endParts[1];
    if (end <= start) end += 24 * 60;
    return end - start;
}

function formatDuration(minutes) {
    if (minutes === null || minutes === undefined) return "—";
    return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

function getCalorieGoal() {
    return (currentProfile && currentProfile.goal) ? currentProfile.goal : DEFAULT_CALORIE_GOAL;
}

function updateActivityButton(button, active) {
    if (!button) return;
    button.classList.toggle("active", Boolean(active));
    if (button.id === "gymButton" && $("gymStatus")) $("gymStatus").textContent = active ? "Registrado ✓" : "No fui";
    if (button.id === "runButton" && $("runStatus")) $("runStatus").textContent = active ? "Registrado ✓" : "No corrí";
}

function updateSummary() {
    const record = getFormData();
    const calories = calculateCalories(record);
    const calorieGoal = getCalorieGoal();
    const percentage = Math.min(100, Math.round((calories / calorieGoal) * 100));

    if ($("calorieTotal")) $("calorieTotal").textContent = `${calories} kcal`;
    if ($("caloriePercent")) $("caloriePercent").textContent = `${percentage}%`;
    if ($("calorieRing")) $("calorieRing").style.setProperty("--progress", `${percentage}%`);
    if ($("calorieGoal")) $("calorieGoal").textContent = calorieGoal;

    if ($("gymSummary")) $("gymSummary").textContent = record.gym ? "Sí" : "No";
    if ($("gymMinutesSummary")) $("gymMinutesSummary").textContent = record.gym ? `${record.gymMinutes || 0} min` : "Sin actividad";

    if ($("runningSummary")) $("runningSummary").textContent = `${record.runningKm || 0} km`;
    if ($("runningTimeSummary")) $("runningTimeSummary").textContent = record.running ? `${record.runningMinutes || 0} min` : "Sin carrera";

    const fasting = calculateFastingMinutes(record);
    if ($("fastingSummary")) $("fastingSummary").textContent = formatDuration(fasting);
    if ($("fastingSummaryText")) $("fastingSummaryText").textContent = fasting !== null ? `${record.fastingStart} → ${record.fastingEnd}` : "Sin registrar";
}

function updateFasting() {
    const record = getFormData();
    const minutes = calculateFastingMinutes(record);

    if ($("fastingBig")) $("fastingBig").textContent = formatDuration(minutes);
    if (minutes === null) {
        if ($("fastingProgress")) $("fastingProgress").style.width = "0%";
        if ($("fastingMessage")) $("fastingMessage").textContent = "Completá las horas.";
        return;
    }

    const goalMinutes = FASTING_GOAL * 60;
    const percentage = Math.min(100, (minutes / goalMinutes) * 100);

    if ($("fastingProgress")) $("fastingProgress").style.width = `${percentage}%`;

    if (minutes >= goalMinutes) {
        if ($("fastingMessage")) $("fastingMessage").textContent = "🎉 ¡Objetivo de 16 horas alcanzado!";
    } else {
        if ($("fastingMessage")) $("fastingMessage").textContent = `Faltan ${formatDuration(goalMinutes - minutes)} para llegar a 16 h.`;
    }
}

async function renderHistory() {
    if (!currentUser) return;

    const { data: rows } = await supabaseClient
        .from('registros')
        .select('date, data')
        .eq('user_id', currentUser.id)
        .order('date', { ascending: false })
        .limit(30);

    const history = $("history");
    if (!history) return;

    const count = rows ? rows.length : 0;
    if ($("daysCount")) $("daysCount").textContent = `${count} ${count === 1 ? "día" : "días"}`;

    if (!rows || !rows.length) {
        history.innerHTML = `<p class="muted">Todavía no tenés días registrados.</p>`;
        return;
    }

    history.innerHTML = "";
    rows.forEach(row => {
        const date = row.date;
        const record = row.data;
        const calories = calculateCalories(record);
        const fasting = calculateFastingMinutes(record);

        const item = document.createElement("div");
        item.className = "history-item";
        item.innerHTML = `
            <div>
                <div class="history-date">${formatDate(date)}</div>
                <div class="history-details">
                    🔥 ${calories} kcal &nbsp;·&nbsp; ${record.gym ? "🏋️ Gimnasio" : "—"} &nbsp;·&nbsp; 🏃 ${record.runningKm || 0} km &nbsp;·&nbsp; ⏱️ ${fasting === null ? "—" : formatDuration(fasting)}
                </div>
            </div>
            <button class="history-open" data-date="${date}">Abrir</button>
        `;
        history.appendChild(item);
    });

    document.querySelectorAll(".history-open").forEach(button => {
        button.addEventListener("click", () => {
            $("date").value = button.dataset.date;
            loadRecord();
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    });
}

async function renderChart() {
    if (!currentUser) return;

    const selectedDate = new Date(getSelectedDate() + "T12:00:00");
    const calorieGoal = getCalorieGoal();
    const daysKeys = [];

    for (let i = 6; i >= 0; i--) {
        const date = new Date(selectedDate);
        date.setDate(selectedDate.getDate() - i);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        daysKeys.push({ key, label: date.toLocaleDateString("es-UY", { weekday: "short" }).replace(".", "") });
    }

    const { data: rows } = await supabaseClient
        .from('registros')
        .select('date, data')
        .eq('user_id', currentUser.id)
        .in('date', daysKeys.map(d => d.key));

    const recordsMap = {};
    if (rows) rows.forEach(r => recordsMap[r.date] = r.data);

    const days = daysKeys.map(d => {
        const record = recordsMap[d.key] || emptyRecord();
        return { calories: calculateCalories(record), label: d.label };
    });

    const maxCalories = Math.max(calorieGoal, ...days.map(d => d.calories));
    const chart = $("weeklyChart");
    if (!chart) return;
    chart.innerHTML = "";

    days.forEach((day, index) => {
        const column = document.createElement("div");
        column.className = "chart-column";
        const height = Math.max(5, (day.calories / maxCalories) * 145);
        column.innerHTML = `
            <div class="chart-bar" style="height: ${height}px; animation-delay: ${index * 0.05}s;" title="${day.calories} kcal"></div>
            <span>${day.label}</span>
        `;
        chart.appendChild(column);
    });
}

function updateEverything() {
    if ($("prettyDate")) $("prettyDate").textContent = formatDate(getSelectedDate());
    updateSummary();
    updateFasting();
    renderHistory();
    renderChart();
}

function showToast(message) {
    const toast = $("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(window.toastTimer);
    window.toastTimer = setTimeout(() => toast.classList.remove("show"), 1800);
}

function createMeals() {
    const container = $("meals");
    if (!container) return;
    container.innerHTML = "";

    meals.forEach(m => {
        const wrapper = document.createElement("div");
        wrapper.className = "meal-form";
        wrapper.innerHTML = `
            <div class="meal-icon">${m.icon}</div>
            <div class="meal-content">
                <div class="meal-title"><strong>${m.name}</strong></div>
                <div class="meal-inputs-container">
                    <textarea id="${m.id}Text" class="meal-input" placeholder="¿Qué comiste?"></textarea>
                    <input id="${m.id}Cal" class="meal-cal-input" type="number" min="0" placeholder="Calorías">
                </div>
            </div>
        `;
        container.appendChild(wrapper);
    });
}

function setupProfileEvents() {
    $("btnCalcSuggested")?.addEventListener("click", () => {
        const weight = parseFloat($("userWeight").value);
        const height = parseFloat($("userHeight").value);
        const age = parseInt($("userAge").value);
        const gender = $("userGender").value;
        const activity = parseFloat($("userActivity").value);

        if (!weight || !height || !age) { alert("Completa peso, altura y edad."); return; }

        let bmr = (gender === "hombre")
            ? 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age)
            : 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);

        const suggestedGoal = Math.round(bmr * activity);
        saveUserProfileCloud({ weight, height, age, gender, activity, goal: suggestedGoal, isManual: false });
    });

    $("btnSaveManual")?.addEventListener("click", () => {
        const manualGoal = parseInt($("userManualGoal").value);
        if (!manualGoal || manualGoal <= 0) { alert("Ingresá un valor válido."); return; }

        saveUserProfileCloud({
            weight: parseFloat($("userWeight").value) || null,
            height: parseFloat($("userHeight").value) || null,
            age: parseInt($("userAge").value) || null,
            gender: $("userGender")?.value,
            activity: parseFloat($("userActivity")?.value),
            goal: manualGoal,
            isManual: true
        });
    });
}

function setupEvents() {
    $("gymButton")?.addEventListener("click", () => {
        updateActivityButton($("gymButton"), !$("gymButton").classList.contains("active"));
        updateSummary();
    });

    $("runButton")?.addEventListener("click", () => {
        updateActivityButton($("runButton"), !$("runButton").classList.contains("active"));
        updateSummary();
    });

    document.querySelectorAll("input, textarea").forEach(input => {
        input.addEventListener("input", () => {
            updateSummary();
            updateFasting();
        });
    });

    $("date")?.addEventListener("change", () => loadRecord());
    $("saveButton")?.addEventListener("click", () => saveDayCloud());
    $("clearButton")?.addEventListener("click", () => clearDay());
    
    $("themeToggle")?.addEventListener("click", () => {
        document.body.classList.toggle("dark");
        $("themeToggle").textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
    });
}

async function loadAppContent() {
    await fetchUserProfile();
    await loadRecord();
}

function init() {
    if ($("date")) $("date").value = today();
    createMeals();
    setupEvents();
    setupProfileEvents();
    setupAuth();
}

document.addEventListener("DOMContentLoaded", init);
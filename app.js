/* =========================================================
   MI REGISTRO — APP.JS
   ========================================================= */

/* ---------------------------------------------------------
   CONFIGURACIÓN Y CLAVES
   --------------------------------------------------------- */

const DEFAULT_CALORIE_GOAL = 2000;
const FASTING_GOAL = 16;

const STORAGE_KEY = "miRegistro";
const PROFILE_KEY = "miRegistroPerfil";

const meals = [
    { id: "breakfast", name: "Desayuno", icon: "🌅" },
    { id: "lunch", name: "Almuerzo", icon: "🥗" },
    { id: "snack", name: "Merienda", icon: "☕" },
    { id: "dinner", name: "Cena", icon: "🍽️" },
    { id: "other", name: "Otros", icon: "🍎" }
];


/* ---------------------------------------------------------
   HELPERS
   --------------------------------------------------------- */

function $(id) {
    return document.getElementById(id);
}

function today() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getDatabase() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (error) {
        console.error("No se pudieron leer los datos:", error);
        return {};
    }
}

function saveDatabase(database) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
}

function getSelectedDate() {
    return $("date").value;
}


/* ---------------------------------------------------------
   SISTEMA DE PERFIL Y META DE CALORÍAS DINÁMICA
   --------------------------------------------------------- */

function getUserProfile() {
    try {
        return JSON.parse(localStorage.getItem(PROFILE_KEY)) || null;
    } catch (e) {
        return null;
    }
}

function saveUserProfile(profile) {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

function getCalorieGoal() {
    const profile = getUserProfile();
    if (profile && profile.goal) {
        return profile.goal;
    }
    return DEFAULT_CALORIE_GOAL;
}

function loadProfileUI() {
    const profile = getUserProfile();
    if (!profile) return;

    if (profile.weight) $("userWeight").value = profile.weight;
    if (profile.height) $("userHeight").value = profile.height;
    if (profile.age) $("userAge").value = profile.age;
    if (profile.gender) $("userGender").value = profile.gender;
    if (profile.activity) $("userActivity").value = profile.activity;
    if (profile.isManual && profile.goal) $("userManualGoal").value = profile.goal;

    const badge = $("profileStatusBadge");
    if (badge) {
        badge.textContent = profile.isManual ? "Meta Manual" : "Meta Sugerida";
    }
}

function setupProfileEvents() {
    // Botón: Usar Meta Sugerida
    $("btnCalcSuggested")?.addEventListener("click", () => {
        const weight = parseFloat($("userWeight").value);
        const height = parseFloat($("userHeight").value);
        const age = parseInt($("userAge").value);
        const gender = $("userGender").value;
        const activity = parseFloat($("userActivity").value);

        if (!weight || !height || !age) {
            alert("Por favor completa peso, altura y edad para calcular tu meta sugerida.");
            return;
        }

        // Fórmula Harris-Benedict
        let bmr = 0;
        if (gender === "hombre") {
            bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
        } else {
            bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
        }

        const suggestedGoal = Math.round(bmr * activity);

        saveUserProfile({
            weight, height, age, gender, activity,
            goal: suggestedGoal,
            isManual: false
        });

        loadProfileUI();
        updateEverything();
        showToast("✓ Meta sugerida guardada");
    });

    // Botón: Guardar Meta Manual
    $("btnSaveManual")?.addEventListener("click", () => {
        const manualGoal = parseInt($("userManualGoal").value);

        if (!manualGoal || manualGoal <= 0) {
            alert("Por favor ingresa un valor válido en la Meta Manual.");
            return;
        }

        saveUserProfile({
            weight: parseFloat($("userWeight").value) || null,
            height: parseFloat($("userHeight").value) || null,
            age: parseInt($("userAge").value) || null,
            gender: $("userGender").value,
            activity: parseFloat($("userActivity").value),
            goal: manualGoal,
            isManual: true
        });

        loadProfileUI();
        updateEverything();
        showToast("✓ Meta manual guardada");
    });
}


/* ---------------------------------------------------------
   FORMATO DE FECHA
   --------------------------------------------------------- */

function formatDate(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString + "T12:00:00");
    return date.toLocaleDateString("es-UY", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}


/* ---------------------------------------------------------
   CREAR REGISTRO VACÍO Y OBTENER REGISTRO
   --------------------------------------------------------- */

function emptyRecord() {
    return {
        breakfast: "", breakfastCal: 0,
        lunch: "", lunchCal: 0,
        snack: "", snackCal: 0,
        dinner: "", dinnerCal: 0,
        other: "", otherCal: 0,
        gym: false, gymMinutes: 0,
        running: false, runningKm: 0, runningMinutes: 0,
        activityNotes: "",
        fastingStart: "", fastingEnd: ""
    };
}

function getTodayRecord() {
    const database = getDatabase();
    const date = getSelectedDate();
    return database[date] || emptyRecord();
}


/* ---------------------------------------------------------
   LEER FORMULARIO DE COMIDAS / ACTIVIDAD
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

        gym: $("gymButton")?.classList.contains("active"),
        gymMinutes: Number($("gymMinutes")?.value || 0),

        running: $("runButton")?.classList.contains("active"),
        runningKm: Number($("runningKm")?.value || 0),
        runningMinutes: Number($("runningMinutes")?.value || 0),

        activityNotes: $("activityNotes")?.value || "",
        fastingStart: $("fastingStart")?.value || "",
        fastingEnd: $("fastingEnd")?.value || ""
    };
}


/* ---------------------------------------------------------
   TOTAL DE CALORÍAS
   --------------------------------------------------------- */

function calculateCalories(record) {
    return (
        Number(record.breakfastCal || 0) +
        Number(record.lunchCal || 0) +
        Number(record.snackCal || 0) +
        Number(record.dinnerCal || 0) +
        Number(record.otherCal || 0)
    );
}


/* ---------------------------------------------------------
   AYUNO Y FORMATEO
   --------------------------------------------------------- */

function calculateFastingMinutes(record) {
    if (!record.fastingStart || !record.fastingEnd) return null;

    const startParts = record.fastingStart.split(":").map(Number);
    const endParts = record.fastingEnd.split(":").map(Number);

    let start = startParts[0] * 60 + startParts[1];
    let end = endParts[0] * 60 + endParts[1];

    if (end <= start) {
        end += 24 * 60;
    }

    return end - start;
}

function formatDuration(minutes) {
    if (minutes === null || minutes === undefined) return "—";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours} h ${mins} min`;
}

function updateDateHeader() {
    const date = getSelectedDate();
    $("prettyDate").textContent = formatDate(date);
}


/* ---------------------------------------------------------
   CREAR CAMPOS DE COMIDAS
   --------------------------------------------------------- */

function createMeals() {
    const container = $("meals");
    if (!container) return;

    container.innerHTML = "";

    meals.forEach(meal => {
        const wrapper = document.createElement("div");
        wrapper.className = "meal-form";
        wrapper.innerHTML = `
            <div class="meal-icon">${meal.icon}</div>
            <div class="meal-content">
                <div class="meal-title"><strong>${meal.name}</strong></div>
                <div class="meal-inputs-container">
                    <textarea id="${meal.id}Text" class="meal-input" placeholder="¿Qué comiste?"></textarea>
                    <input id="${meal.id}Cal" class="meal-cal-input" type="number" min="0" placeholder="Calorías (kcal)">
                </div>
            </div>
        `;
        container.appendChild(wrapper);
    });
}


/* ---------------------------------------------------------
   CARGAR DATOS EN FORMULARIO
   --------------------------------------------------------- */

function loadRecord() {
    const record = getTodayRecord();

    meals.forEach(meal => {
        const textInput = $(`${meal.id}Text`);
        const calorieInput = $(`${meal.id}Cal`);

        if (textInput) textInput.value = record[meal.id] || "";
        if (calorieInput) calorieInput.value = record[meal.id + "Cal"] || "";
    });

    $("gymMinutes").value = record.gymMinutes || "";
    $("runningKm").value = record.runningKm || "";
    $("runningMinutes").value = record.runningMinutes || "";
    $("activityNotes").value = record.activityNotes || "";
    $("fastingStart").value = record.fastingStart || "";
    $("fastingEnd").value = record.fastingEnd || "";

    updateActivityButton($("gymButton"), record.gym);
    updateActivityButton($("runButton"), record.running);

    updateEverything();
}


/* ---------------------------------------------------------
   ACTIVIDAD
   --------------------------------------------------------- */

function updateActivityButton(button, active) {
    if (!button) return;

    button.classList.toggle("active", Boolean(active));

    if (button.id === "gymButton") {
        $("gymStatus").textContent = active ? "Registrado ✓" : "No fui";
    }

    if (button.id === "runButton") {
        $("runStatus").textContent = active ? "Registrado ✓" : "No corrí";
    }
}


/* ---------------------------------------------------------
   GUARDAR Y LIMPIAR DÍA
   --------------------------------------------------------- */

function saveDay() {
    const database = getDatabase();
    const date = getSelectedDate();
    const data = getFormData();

    database[date] = data;
    saveDatabase(database);

    showToast("✓ Día guardado");
    updateEverything();
}

function clearDay() {
    const confirmClear = confirm("¿Querés limpiar todos los datos de este día?");
    if (!confirmClear) return;

    const database = getDatabase();
    const date = getSelectedDate();

    delete database[date];
    saveDatabase(database);

    loadRecord();
    showToast("Día limpiado");
}


/* ---------------------------------------------------------
   ACTUALIZAR RESUMEN (Usa la meta dinámica)
   --------------------------------------------------------- */

function updateSummary() {
    const record = getFormData();
    const calories = calculateCalories(record);
    const calorieGoal = getCalorieGoal();

    const percentage = Math.min(100, Math.round((calories / calorieGoal) * 100));

    $("calorieTotal").textContent = `${calories} kcal`;
    $("caloriePercent").textContent = `${percentage}%`;

    const ring = $("calorieRing");
    if (ring) {
        ring.style.setProperty("--progress", `${percentage}%`);
    }

    $("calorieGoal").textContent = calorieGoal;

    /* GIMNASIO */
    $("gymSummary").textContent = record.gym ? "Sí" : "No";
    $("gymMinutesSummary").textContent = record.gym ? `${record.gymMinutes || 0} min` : "Sin actividad";

    /* RUNNING */
    $("runningSummary").textContent = `${record.runningKm || 0} km`;
    $("runningTimeSummary").textContent = record.running ? `${record.runningMinutes || 0} min` : "Sin carrera";

    /* AYUNO */
    const fasting = calculateFastingMinutes(record);
    $("fastingSummary").textContent = formatDuration(fasting);

    if (fasting !== null) {
        $("fastingSummaryText").textContent = `${record.fastingStart} → ${record.fastingEnd}`;
    } else {
        $("fastingSummaryText").textContent = "Sin registrar";
    }
}


/* ---------------------------------------------------------
   ACTUALIZAR AYUNO
   --------------------------------------------------------- */

function updateFasting() {
    const record = getFormData();
    const minutes = calculateFastingMinutes(record);

    $("fastingBig").textContent = formatDuration(minutes);

    if (minutes === null) {
        $("fastingProgress").style.width = "0%";
        $("fastingMessage").textContent = "Completá las horas.";
        return;
    }

    const goalMinutes = FASTING_GOAL * 60;
    const percentage = Math.min(100, (minutes / goalMinutes) * 100);

    $("fastingProgress").style.width = `${percentage}%`;

    if (minutes >= goalMinutes) {
        $("fastingMessage").textContent = "🎉 ¡Objetivo de 16 horas alcanzado!";
    } else {
        const remaining = goalMinutes - minutes;
        $("fastingMessage").textContent = `Faltan ${formatDuration(remaining)} para llegar a 16 h.`;
    }
}


/* ---------------------------------------------------------
   HISTORIAL
   --------------------------------------------------------- */

function renderHistory() {
    const database = getDatabase();
    const dates = Object.keys(database).sort().reverse();
    const history = $("history");

    $("daysCount").textContent = `${dates.length} ${dates.length === 1 ? "día" : "días"}`;

    if (!dates.length) {
        history.innerHTML = `<p class="muted">Todavía no tenés días registrados.</p>`;
        return;
    }

    history.innerHTML = "";

    dates.slice(0, 30).forEach(date => {
        const record = database[date];
        const calories = calculateCalories(record);
        const fasting = calculateFastingMinutes(record);

        const item = document.createElement("div");
        item.className = "history-item";
        item.innerHTML = `
            <div>
                <div class="history-date">${formatDate(date)}</div>
                <div class="history-details">
                    🔥 ${calories} kcal
                    &nbsp; · &nbsp;
                    ${record.gym ? "🏋️ Gimnasio" : "—"}
                    &nbsp; · &nbsp;
                    🏃 ${record.runningKm || 0} km
                    &nbsp; · &nbsp;
                    ⏱️ ${fasting === null ? "—" : formatDuration(fasting)}
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


/* ---------------------------------------------------------
   GRÁFICO DE 7 DÍAS
   --------------------------------------------------------- */

function renderChart() {
    const database = getDatabase();
    const calorieGoal = getCalorieGoal();
    const selectedDate = new Date(getSelectedDate() + "T12:00:00");
    const days = [];

    for (let i = 6; i >= 0; i--) {
        const date = new Date(selectedDate);
        date.setDate(selectedDate.getDate() - i);

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const key = `${year}-${month}-${day}`;

        const record = database[key] || emptyRecord();

        days.push({
            key,
            calories: calculateCalories(record),
            label: date.toLocaleDateString("es-UY", { weekday: "short" }).replace(".", "")
        });
    }

    const maxCalories = Math.max(calorieGoal, ...days.map(d => d.calories));
    const chart = $("weeklyChart");
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


/* ---------------------------------------------------------
   EVENTOS
   --------------------------------------------------------- */

function updateMealsPreview() {
    const mealContainer = $("meals");
    if (!mealContainer) return;

    const inputs = mealContainer.querySelectorAll("textarea, input");
    inputs.forEach(input => {
        input.addEventListener("input", () => {
            updateSummary();
        });
    });
}

function updateEverything() {
    updateDateHeader();
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

    setTimeout(() => {
        toast.classList.remove("show");
    }, 1800);
}

function setupTheme() {
    const savedTheme = localStorage.getItem("miRegistroTheme");

    if (savedTheme === "dark") {
        document.body.classList.add("dark");
        $("themeToggle").textContent = "☀️";
    }

    $("themeToggle").addEventListener("click", () => {
        document.body.classList.toggle("dark");
        const dark = document.body.classList.contains("dark");
        localStorage.setItem("miRegistroTheme", dark ? "dark" : "light");
        $("themeToggle").textContent = dark ? "☀️" : "🌙";
    });
}

function setupActivityButtons() {
    $("gymButton").addEventListener("click", () => {
        const active = !$("gymButton").classList.contains("active");
        updateActivityButton($("gymButton"), active);
        updateEverything();
    });

    $("runButton").addEventListener("click", () => {
        const active = !$("runButton").classList.contains("active");
        updateActivityButton($("runButton"), active);
        updateEverything();
    });
}

function setupFormEvents() {
    document.querySelectorAll("input, textarea").forEach(input => {
        input.addEventListener("input", () => {
            updateSummary();
            updateFasting();
        });
    });

    $("date").addEventListener("change", () => {
        loadRecord();
    });

    $("saveButton").addEventListener("click", () => {
        saveDay();
    });

    $("clearButton").addEventListener("click", () => {
        clearDay();
    });
}


/* ---------------------------------------------------------
   INICIALIZACIÓN
   --------------------------------------------------------- */

function init() {
    console.log("Mi Registro iniciado 🚀");

    $("date").value = today();

    createMeals();
    setupTheme();
    setupActivityButtons();
    setupFormEvents();
    
    // Inicializar lógica de Perfil
    loadProfileUI();
    setupProfileEvents();

    loadRecord();
    updateMealsPreview();
}

document.addEventListener("DOMContentLoaded", init);
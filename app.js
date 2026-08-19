/* =========================================================
   MI REGISTRO — APP.JS
   ========================================================= */

const CALORIE_GOAL = 2000;
const FASTING_GOAL = 16;
const STORAGE_KEY = "miRegistro";

const meals = [
    {
        id: "breakfast",
        name: "Desayuno",
        icon: "🌅"
    },
    {
        id: "lunch",
        name: "Almuerzo",
        icon: "🥗"
    },
    {
        id: "snack",
        name: "Merienda",
        icon: "☕"
    },
    {
        id: "dinner",
        name: "Cena",
        icon: "🍽️"
    },
    {
        id: "other",
        name: "Otros",
        icon: "🍎"
    }
];


/* =========================================================
   HELPERS
   ========================================================= */

function $(id) {
    return document.getElementById(id);
}


function today() {

    const date = new Date();

    const year = date.getFullYear();

    const month = String(
        date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function getDatabase() {

    try {

        return JSON.parse(
            localStorage.getItem(STORAGE_KEY)
        ) || {};

    } catch (error) {

        console.error(
            "Error leyendo los datos:",
            error
        );

        return {};

    }

}


function saveDatabase(database) {

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(database)
    );

}


function getSelectedDate() {

    return $("date").value;

}


/* =========================================================
   FECHAS
   ========================================================= */

function formatDate(dateString) {

    if (!dateString) {
        return "";
    }

    const date = new Date(
        dateString + "T12:00:00"
    );

    return date.toLocaleDateString(
        "es-UY",
        {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        }
    );

}


/* =========================================================
   REGISTRO VACÍO
   ========================================================= */

function emptyRecord() {

    return {

        breakfast: "",
        breakfastCal: 0,

        lunch: "",
        lunchCal: 0,

        snack: "",
        snackCal: 0,

        dinner: "",
        dinnerCal: 0,

        other: "",
        otherCal: 0,

        gym: false,
        gymMinutes: 0,

        running: false,
        runningKm: 0,
        runningMinutes: 0,

        activityNotes: "",

        fastingStart: "",
        fastingEnd: ""

    };

}


/* =========================================================
   OBTENER REGISTRO
   ========================================================= */

function getTodayRecord() {

    const database = getDatabase();

    const date = getSelectedDate();

    return database[date] || emptyRecord();

}


/* =========================================================
   LEER FORMULARIO
   ========================================================= */

function getFormData() {

    return {

        breakfast:
            $("breakfastText")?.value || "",

        breakfastCal:
            Number(
                $("breakfastCal")?.value || 0
            ),

        lunch:
            $("lunchText")?.value || "",

        lunchCal:
            Number(
                $("lunchCal")?.value || 0
            ),

        snack:
            $("snackText")?.value || "",

        snackCal:
            Number(
                $("snackCal")?.value || 0
            ),

        dinner:
            $("dinnerText")?.value || "",

        dinnerCal:
            Number(
                $("dinnerCal")?.value || 0
            ),

        other:
            $("otherText")?.value || "",

        otherCal:
            Number(
                $("otherCal")?.value || 0
            ),

        gym:
            $("gymButton")
                ?.classList
                .contains("active"),

        gymMinutes:
            Number(
                $("gymMinutes")?.value || 0
            ),

        running:
            $("runButton")
                ?.classList
                .contains("active"),

        runningKm:
            Number(
                $("runningKm")?.value || 0
            ),

        runningMinutes:
            Number(
                $("runningMinutes")?.value || 0
            ),

        activityNotes:
            $("activityNotes")?.value || "",

        fastingStart:
            $("fastingStart")?.value || "",

        fastingEnd:
            $("fastingEnd")?.value || ""

    };

}


/* =========================================================
   GUARDADO AUTOMÁTICO
   ========================================================= */

function autoSave() {

    const database = getDatabase();

    const date = getSelectedDate();

    if (!date) {
        return;
    }

    database[date] = getFormData();

    saveDatabase(database);

    console.log(
        `Guardado automático: ${date}`
    );

}


/* =========================================================
   CALORÍAS
   ========================================================= */

function calculateCalories(record) {

    return (

        Number(record.breakfastCal || 0) +

        Number(record.lunchCal || 0) +

        Number(record.snackCal || 0) +

        Number(record.dinnerCal || 0) +

        Number(record.otherCal || 0)

    );

}


/* =========================================================
   AYUNO
   ========================================================= */

function calculateFastingMinutes(record) {

    if (
        !record.fastingStart ||
        !record.fastingEnd
    ) {

        return null;

    }

    const startParts =
        record.fastingStart
            .split(":")
            .map(Number);

    const endParts =
        record.fastingEnd
            .split(":")
            .map(Number);

    let start =
        startParts[0] * 60 +
        startParts[1];

    let end =
        endParts[0] * 60 +
        endParts[1];

    /*
       Si termina al día siguiente.
       Ejemplo:
       21:00 → 13:00 = 16 horas
    */

    if (end <= start) {

        end += 24 * 60;

    }

    return end - start;

}


/* =========================================================
   FORMATEAR DURACIÓN
   ========================================================= */

function formatDuration(minutes) {

    if (
        minutes === null ||
        minutes === undefined
    ) {

        return "—";

    }

    const hours =
        Math.floor(minutes / 60);

    const mins =
        minutes % 60;

    return `${hours} h ${mins} min`;

}


/* =========================================================
   FECHA EN PANTALLA
   ========================================================= */

function updateDateHeader() {

    $("prettyDate").textContent =
        formatDate(
            getSelectedDate()
        );

}


/* =========================================================
   CREAR COMIDAS
   ========================================================= */

function createMeals() {

    const container =
        $("meals");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    meals.forEach(meal => {

        const wrapper =
            document.createElement("div");

        wrapper.className =
            "meal-form";

        wrapper.innerHTML = `

            <div class="meal-icon">
                ${meal.icon}
            </div>

            <div class="meal-content">

                <div class="meal-title">

                    <strong>
                        ${meal.name}
                    </strong>

                </div>

                <textarea
                    id="${meal.id}Text"
                    class="meal-input"
                    placeholder="¿Qué comiste?"
                ></textarea>

                <input
                    id="${meal.id}Cal"
                    class="meal-cal-input"
                    type="number"
                    min="0"
                    placeholder="Calorías"
                >

            </div>

        `;

        container.appendChild(
            wrapper
        );

    });

}


/* =========================================================
   CARGAR REGISTRO
   ========================================================= */

function loadRecord() {

    const record =
        getTodayRecord();

    meals.forEach(meal => {

        const textInput =
            $(`${meal.id}Text`);

        const calorieInput =
            $(`${meal.id}Cal`);

        if (textInput) {

            textInput.value =
                record[meal.id] || "";

        }

        if (calorieInput) {

            calorieInput.value =
                record[
                    meal.id + "Cal"
                ] || "";

        }

    });


    $("gymMinutes").value =
        record.gymMinutes || "";


    $("runningKm").value =
        record.runningKm || "";


    $("runningMinutes").value =
        record.runningMinutes || "";


    $("activityNotes").value =
        record.activityNotes || "";


    $("fastingStart").value =
        record.fastingStart || "";


    $("fastingEnd").value =
        record.fastingEnd || "";


    updateActivityButton(
        $("gymButton"),
        record.gym
    );


    updateActivityButton(
        $("runButton"),
        record.running
    );


    updateEverything();

}


/* =========================================================
   ACTIVIDAD
   ========================================================= */

function updateActivityButton(
    button,
    active
) {

    if (!button) {
        return;
    }

    button.classList.toggle(
        "active",
        Boolean(active)
    );


    if (
        button.id === "gymButton"
    ) {

        $("gymStatus").textContent =
            active
                ? "Registrado ✓"
                : "No fui";

    }


    if (
        button.id === "runButton"
    ) {

        $("runStatus").textContent =
            active
                ? "Registrado ✓"
                : "No corrí";

    }

}


/* =========================================================
   GUARDAR MANUALMENTE
   ========================================================= */

function saveDay() {

    autoSave();

    showToast(
        "✓ Día guardado"
    );

    updateEverything();

}


/* =========================================================
   LIMPIAR DÍA
   ========================================================= */

function clearDay() {

    const confirmClear =
        confirm(
            "¿Querés limpiar todos los datos de este día?"
        );

    if (!confirmClear) {
        return;
    }

    const database =
        getDatabase();

    const date =
        getSelectedDate();

    delete database[date];

    saveDatabase(database);

    loadRecord();

    showToast(
        "Día limpiado"
    );

}


/* =========================================================
   RESUMEN
   ========================================================= */

function updateSummary() {

    const record =
        getFormData();

    const calories =
        calculateCalories(
            record
        );

    const percentage =
        Math.min(
            100,
            Math.round(
                calories /
                CALORIE_GOAL *
                100
            )
        );


    $("calorieTotal").textContent =
        `${calories} kcal`;


    $("caloriePercent").textContent =
        `${percentage}%`;


    const ring =
        $("calorieRing");

    if (ring) {

        ring.style.setProperty(
            "--progress",
            `${percentage}%`
        );

    }


    $("calorieGoal").textContent =
        CALORIE_GOAL;


    /* GIMNASIO */

    $("gymSummary").textContent =
        record.gym
            ? "Sí"
            : "No";


    $("gymMinutesSummary").textContent =
        record.gym
            ? `${record.gymMinutes || 0} min`
            : "Sin actividad";


    /* RUNNING */

    $("runningSummary").textContent =
        `${record.runningKm || 0} km`;


    $("runningTimeSummary").textContent =
        record.running
            ? `${record.runningMinutes || 0} min`
            : "Sin carrera";


    /* AYUNO */

    const fasting =
        calculateFastingMinutes(
            record
        );


    $("fastingSummary").textContent =
        formatDuration(
            fasting
        );


    if (fasting !== null) {

        $("fastingSummaryText").textContent =
            `${record.fastingStart} → ${record.fastingEnd}`;

    } else {

        $("fastingSummaryText").textContent =
            "Sin registrar";

    }

}


/* =========================================================
   ACTUALIZAR AYUNO
   ========================================================= */

function updateFasting() {

    const record =
        getFormData();

    const minutes =
        calculateFastingMinutes(
            record
        );


    $("fastingBig").textContent =
        formatDuration(
            minutes
        );


    if (minutes === null) {

        $("fastingProgress").style.width =
            "0%";

        $("fastingMessage").textContent =
            "Completá las horas.";

        return;

    }


    const goalMinutes =
        FASTING_GOAL * 60;


    const percentage =
        Math.min(
            100,
            minutes /
            goalMinutes *
            100
        );


    $("fastingProgress").style.width =
        `${percentage}%`;


    if (
        minutes >= goalMinutes
    ) {

        $("fastingMessage").textContent =
            "🎉 ¡Objetivo de 16 horas alcanzado!";

    } else {

        const remaining =
            goalMinutes -
            minutes;

        $("fastingMessage").textContent =
            `Faltan ${formatDuration(
                remaining
            )} para llegar a 16 h.`;

    }

}


/* =========================================================
   HISTORIAL
   ========================================================= */

function renderHistory() {

    const database =
        getDatabase();

    const dates =
        Object.keys(database)
            .sort()
            .reverse();

    const history =
        $("history");


    $("daysCount").textContent =
        `${dates.length} ${
            dates.length === 1
                ? "día"
                : "días"
        }`;


    if (!dates.length) {

        history.innerHTML = `
            <p class="muted">
                Todavía no tenés días registrados.
            </p>
        `;

        return;

    }


    history.innerHTML = "";


    dates
        .slice(0, 30)
        .forEach(date => {

            const record =
                database[date];

            const calories =
                calculateCalories(
                    record
                );

            const fasting =
                calculateFastingMinutes(
                    record
                );


            const item =
                document.createElement(
                    "div"
                );

            item.className =
                "history-item";


            item.innerHTML = `

                <div>

                    <div class="history-date">
                        ${formatDate(date)}
                    </div>

                    <div class="history-details">

                        🔥 ${calories} kcal

                        &nbsp; · &nbsp;

                        ${
                            record.gym
                                ? "🏋️ Gimnasio"
                                : "—"
                        }

                        &nbsp; · &nbsp;

                        🏃 ${
                            record.runningKm || 0
                        } km

                        &nbsp; · &nbsp;

                        ⏱️ ${
                            fasting === null
                                ? "—"
                                : formatDuration(fasting)
                        }

                    </div>

                </div>

                <button
                    class="history-open"
                    data-date="${date}"
                >
                    Abrir
                </button>

            `;


            history.appendChild(
                item
            );

        });


    document
        .querySelectorAll(
            ".history-open"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    $("date").value =
                        button.dataset.date;

                    loadRecord();

                    window.scrollTo({
                        top: 0,
                        behavior: "smooth"
                    });

                }
            );

        });

}


/* =========================================================
   GRÁFICO
   ========================================================= */

function renderChart() {

    const database =
        getDatabase();

    const selectedDate =
        new Date(
            getSelectedDate() +
            "T12:00:00"
        );


    const days = [];


    for (
        let i = 6;
        i >= 0;
        i--
    ) {

        const date =
            new Date(
                selectedDate
            );

        date.setDate(
            selectedDate.getDate() -
            i
        );


        const year =
            date.getFullYear();

        const month =
            String(
                date.getMonth() + 1
            ).padStart(2, "0");

        const day =
            String(
                date.getDate()
            ).padStart(2, "0"
            );


        const key =
            `${year}-${month}-${day}`;


        const record =
            database[key] ||
            emptyRecord();


        days.push({

            key,

            calories:
                calculateCalories(
                    record
                ),

            label:
                date
                    .toLocaleDateString(
                        "es-UY",
                        {
                            weekday: "short"
                        }
                    )
                    .replace(
                        ".",
                        ""
                    )

        });

    }


    const maxCalories =
        Math.max(
            CALORIE_GOAL,
            ...days.map(
                day =>
                    day.calories
            )
        );


    const chart =
        $("weeklyChart");

    chart.innerHTML = "";


    days.forEach(
        (day, index) => {

            const column =
                document.createElement(
                    "div"
                );

            column.className =
                "chart-column";


            const height =
                Math.max(
                    5,
                    day.calories /
                    maxCalories *
                    145
                );


            column.innerHTML = `

                <div
                    class="chart-bar"
                    style="
                        height: ${height}px;
                        animation-delay:
                        ${index * 0.05}s;
                    "
                    title="${day.calories} kcal"
                ></div>

                <span>
                    ${day.label}
                </span>

            `;


            chart.appendChild(
                column
            );

        }
    );

}


/* =========================================================
   ACTUALIZAR TODO
   ========================================================= */

function updateEverything() {

    updateDateHeader();

    updateSummary();

    updateFasting();

    renderHistory();

    renderChart();

}


/* =========================================================
   TOAST
   ========================================================= */

function showToast(message) {

    const toast =
        $("toast");

    if (!toast) {
        return;
    }


    toast.textContent =
        message;


    toast.classList.add(
        "show"
    );


    clearTimeout(
        window.toastTimer
    );


    window.toastTimer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            1800
        );

}


/* =========================================================
   MODO OSCURO
   ========================================================= */

function setupTheme() {

    const savedTheme =
        localStorage.getItem(
            "miRegistroTheme"
        );


    if (
        savedTheme === "dark"
    ) {

        document.body.classList.add(
            "dark"
        );

        $("themeToggle").textContent =
            "☀️";

    }


    $("themeToggle")
        .addEventListener(
            "click",
            () => {

                document.body.classList.toggle(
                    "dark"
                );


                const dark =
                    document.body.classList.contains(
                        "dark"
                    );


                localStorage.setItem(
                    "miRegistroTheme",
                    dark
                        ? "dark"
                        : "light"
                );


                $("themeToggle").textContent =
                    dark
                        ? "☀️"
                        : "🌙";

            }
        );

}


/* =========================================================
   BOTONES GIMNASIO / RUNNING
   ========================================================= */

function setupActivityButtons() {

    $("gymButton")
        .addEventListener(
            "click",
            () => {

                const active =
                    !$("gymButton")
                        .classList
                        .contains(
                            "active"
                        );


                updateActivityButton(
                    $("gymButton"),
                    active
                );


                autoSave();

                updateEverything();

            }
        );


    $("runButton")
        .addEventListener(
            "click",
            () => {

                const active =
                    !$("runButton")
                        .classList
                        .contains(
                            "active"
                        );


                updateActivityButton(
                    $("runButton"),
                    active
                );


                autoSave();

                updateEverything();

            }
        );

}


/* =========================================================
   EVENTOS DEL FORMULARIO
   ========================================================= */

function setupFormEvents() {

    document
        .querySelectorAll(
            "input, textarea"
        )
        .forEach(
            input => {

                input.addEventListener(
                    "input",
                    () => {

                        updateSummary();

                        updateFasting();

                        autoSave();

                    }
                );

            }
        );


    $("date")
        .addEventListener(
            "change",
            () => {

                loadRecord();

            }
        );


    $("saveButton")
        .addEventListener(
            "click",
            () => {

                saveDay();

            }
        );


    $("clearButton")
        .addEventListener(
            "click",
            () => {

                clearDay();

            }
        );

}


/* =========================================================
   INICIALIZACIÓN
   ========================================================= */

function init() {

    console.log(
        "Mi Registro iniciado 🚀"
    );


    $("date").value =
        today();


    $("calorieGoal").textContent =
        CALORIE_GOAL;


    createMeals();

    setupTheme();

    setupActivityButtons();

    setupFormEvents();

    loadRecord();

}


/* =========================================================
   ARRANCAR
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    init
);
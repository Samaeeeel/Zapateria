document.addEventListener("DOMContentLoaded", async () => {
    try {
        // Verifica si el usuario está logueado
        const userId = localStorage.getItem("userId");
        if (!userId) {
            if (confirm("Debes iniciar sesión para enviar las especificaciones. ¿Deseas iniciar sesión ahora?")) {
                guardarDatosFormulario();
                localStorage.setItem("redirectAfterLogin", "especificaciones.html");
                window.location.href = "login.html";
                return;
            } else {
                alert("No puedes continuar sin iniciar sesión.");
                window.location.href = "../index.html";
                return;
            }
        }
        cargarDatosFormulario();

        // Rellena los campos de nombre y correo
        document.getElementById("name").value = localStorage.getItem("userName") || "No especificado";
        document.getElementById("email").value = localStorage.getItem("email") || "No especificado";

        // Verifica si los servicios y subservicios están en localStorage
        const service = localStorage.getItem("selectedService");
        const subservice = localStorage.getItem("selectedSubservice");

        if (!service || !subservice) {
            alert("No se seleccionó ningún servicio o subservicio. Por favor, vuelve a la página anterior.");
            window.location.href = "../index.html";
            return;
        }

        // Rellena los campos de servicio y subservicio
        document.getElementById("selected-service").value = service;
        document.getElementById("selected-subservice").value = subservice;
    } catch (error) {
        console.error("Error al cargar los datos iniciales:", error);
    }
});

document.getElementById("specifications-form").addEventListener("submit", async function (event) {
    event.preventDefault();

    const idUsuario = localStorage.getItem("userId");
    if (!idUsuario) {
        alert("Debes iniciar sesión para enviar las especificaciones.");
        window.location.href = "login.html";
        return;
    }

    const service = document.getElementById("selected-service").value;
    const subservice = document.getElementById("selected-subservice").value;
    const nombre = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const telefono = document.getElementById("phone").value || null;
    const detalles = document.getElementById("details").value;

    const formData = {
        idUsuario,
        service,
        subservice,
        nombre,
        email,
        telefono,
        detalles,
    };

    try {
        const response = await fetch("zapateria-production.up.railway.app/guardar-especificaciones", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
        });

        if (response.ok) {
            alert("¡Especificaciones enviadas con éxito!");
            window.location.href = "carrito.html";
        } else {
            const errorData = await response.json();
            alert(`Error: ${errorData.message || "No se pudo guardar los datos."}`);
        }
    } catch (error) {
        console.error("Error al enviar los datos:", error);
        alert("Ocurrió un error al enviar los datos. Inténtalo más tarde.");
    }
});

// Guarda los datos del formulario en localStorage
function guardarDatosFormulario() {
    const formData = {
        selectedService: document.getElementById("selected-service")?.value || "",
        selectedSubservice: document.getElementById("selected-subservice")?.value || "",
        name: document.getElementById("name")?.value || "",
        email: document.getElementById("email")?.value || "",
        phone: document.getElementById("phone")?.value || "",
        details: document.getElementById("details")?.value || "",
    };
    localStorage.setItem("formData", JSON.stringify(formData));
}

// Carga los datos del formulario desde localStorage
function cargarDatosFormulario() {
    const formData = JSON.parse(localStorage.getItem("formData")) || {};
    document.getElementById("selected-service").value = formData.selectedService || "";
    document.getElementById("selected-subservice").value = formData.selectedSubservice || "";
    document.getElementById("name").value = formData.name || "";
    document.getElementById("email").value = formData.email || "";
    document.getElementById("phone").value = formData.phone || "";
    document.getElementById("details").value = formData.details || "";
}

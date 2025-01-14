const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const pool = require("./db"); // Importamos la conexión a la base de datos

const app = express();
const PORT = 5000;


// Middleware
app.use(express.json()); // Para procesar datos JSON enviados desde el cliente
app.use(bodyParser.json()); // Para analizar el cuerpo de las solicitudes JSON
app.use(express.static(path.join(__dirname))); // Servir archivos estáticos desde el directorio raíz


// Ruta para iniciar sesión
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Consulta a la base de datos para verificar credenciales
        const result = await pool.query(
            'SELECT * FROM usuarios WHERE email = $1 AND contrasena = $2',
            [email, password]
        );

        if (result.rows.length > 0) {
            // Usuario encontrado
            const user = result.rows[0];
            res.status(200).json({
                message: 'Inicio de sesión exitoso',
                user: {
                    id_usuario: user.id_usuario,
                    nombre: user.nombre,
                    email: user.email,
                    telefono: user.telefono,
                },
            });
        } else {
            // Credenciales incorrectas
            res.status(401).json({ message: 'Credenciales incorrectas' });
        }
    } catch (error) {
        console.error('Error en /login:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});


// Ruta para registrar un nuevo usuario
app.post("/registrar-usuario", async (req, res) => {
    const { nombre, email, telefono, contrasena } = req.body;

    try {
        const result = await pool.query(
            "INSERT INTO usuarios (nombre, email, telefono, contrasena) VALUES ($1, $2, $3, $4) RETURNING *",
            [nombre, email, telefono, contrasena]
        );

        res.status(201).json({
            message: "Usuario registrado correctamente",
            user: result.rows[0],
        });
    } catch (error) {
        console.error("Error en /registrar-usuario:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
});

// Endpoint para obtener servicios y subservicios
app.get("/obtener-servicios-subservicios", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                s.id_servicio,
                s.nombre_servicio,
                s.descripcion AS servicio_descripcion,
                ss.id_subservicio,
                ss.nombre_subservicio,
                ss.descripcion AS subservicio_descripcion,
                ss.precio
            FROM servicios s
            JOIN subservicios ss ON s.id_servicio = ss.id_servicio
        `);
        res.json(result.rows);
    } catch (error) {
        console.error("Error en /obtener-servicios-subservicios:", error);
        res.status(500).json({ error: "Error al obtener los servicios y subservicios." });
    }
});

app.post("/guardar-especificaciones", async (req, res) => {
    const { idUsuario, service, subservice, nombre, email, telefono, detalles } = req.body;

    if (!idUsuario || !service || !subservice) {
        return res.status(400).json({ message: "Faltan datos obligatorios: usuario, servicio o subservicio." });
    }

    try {
        // Obtener IDs de servicio y subservicio
        const servicioResult = await pool.query(
            "SELECT id_servicio FROM servicios WHERE nombre_servicio = $1",
            [service]
        );
        const subservicioResult = await pool.query(
            "SELECT id_subservicio FROM subservicios WHERE nombre_subservicio = $1",
            [subservice]
        );

        if (servicioResult.rows.length === 0 || subservicioResult.rows.length === 0) {
            return res.status(404).json({ message: "No se encontraron los IDs para el servicio o subservicio." });
        }

        const idServicio = servicioResult.rows[0].id_servicio;
        const idSubservicio = subservicioResult.rows[0].id_subservicio;

        // Insertar especificaciones
        await pool.query(
            `INSERT INTO especificaciones (id_usuario, id_servicio, id_subservicio, nombre_cliente, email_cliente, telefono_cliente, detalles, fecha_creacion) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
            [idUsuario, idServicio, idSubservicio, nombre, email, telefono, detalles]
        );

        // Insertar en el carrito
        await pool.query(
            `INSERT INTO carrito (id_usuario, id_subservicio, cantidad, detalles) 
             VALUES ($1, $2, $3, $4)`,
            [idUsuario, idSubservicio, 1, detalles]
        );

        res.status(201).json({ message: "Especificaciones guardadas correctamente." });
    } catch (error) {
        console.error("Error en /guardar-especificaciones:", error);
        res.status(500).json({ message: "Error interno del servidor." });
    }
});




// Ruta para obtener los datos del carrito de un usuario específico
app.get("/obtener-carrito/:idUsuario", async (req, res) => {
    const { idUsuario } = req.params;

    try {
        const result = await pool.query(
            `SELECT c.id_carrito, c.cantidad, s.nombre_subservicio AS subservicio, 
                    s.precio, sv.nombre_servicio AS servicio, s.descripcion AS detalles
             FROM carrito c
             JOIN subservicios s ON c.id_subservicio = s.id_subservicio
             JOIN servicios sv ON s.id_servicio = sv.id_servicio
             WHERE c.id_usuario = $1`,
            [idUsuario]
        );

        res.json(result.rows);
    } catch (error) {
        console.error("Error en /obtener-carrito:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
});

app.get("/obtener-seleccion/:idUsuario", async (req, res) => {
    const { idUsuario } = req.params;
    try {
        const result = await pool.query(
            `SELECT s.id_servicio, s.nombre_servicio, 
                    ss.id_subservicio, ss.nombre_subservicio
             FROM seleccion_usuario su
             JOIN servicios s ON su.id_servicio = s.id_servicio
             JOIN subservicios ss ON su.id_subservicio = ss.id_subservicio
             WHERE su.id_usuario = $1`,
            [idUsuario]
        );
        if (result.rows.length > 0) {
            res.json(result.rows[0]); // Devuelve solo el primer resultado
        } else {
            res.status(404).json({ message: "No se encontró selección para este usuario." });
        }
    } catch (error) {
        console.error("Error en /obtener-seleccion:", error);
        res.status(500).json({ message: "Error interno del servidor." });
    }
});


// Ruta para eliminar un servicio del carrito de un usuario
app.delete("/eliminar-item/:id", async (req, res) => {
    const { id } = req.params;

    try {
        await pool.query("DELETE FROM carrito WHERE id_carrito = $1", [id]);
        res.status(200).json({ message: "Servicio eliminado correctamente" });
    } catch (error) {
        console.error("Error en /eliminar-item:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
});

// Ruta base para manejar otras solicitudes
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// Ruta para guardar los datos de contacto
app.post("/guardar-contacto", async (req, res) => {
    const { name, email, details } = req.body;

    try {
        // Inserción en la tabla contacto
        const result = await pool.query(
            "INSERT INTO contacto (nombre, email, mensaje, fecha_envio) VALUES ($1, $2, $3, NOW()) RETURNING *",
            [name, email, details]
        );

        res.status(201).json({
            message: "Contacto guardado correctamente",
            contacto: result.rows[0],
        });
    } catch (error) {
        console.error("Error en /guardar-contacto:", error);
        res.status(500).json({
            error: "Hubo un error al guardar el contacto. Inténtalo de nuevo.",
        });
    }
});

app.post("/procesar-factura/:userId", async (req, res) => {
    const { userId } = req.params;

    try {
        const result = await pool.query(
            `INSERT INTO facturas (id_usuario, fecha_emision, total, estado)
             VALUES ($1, NOW(), 0, 'pendiente') RETURNING id_factura`,
            [userId]
        );
        res.status(201).json({ id_factura: result.rows[0].id_factura });
    } catch (error) {
        console.error("Error al procesar la factura:", error);
        res.status(500).json({ message: "Error interno al procesar la factura" });
    }
});

app.post("/confirmar-factura/:facturaId", async (req, res) => {
    const { facturaId } = req.params;

    try {
        const carrito = await pool.query(
            `SELECT id_subservicio, cantidad FROM carrito WHERE id_usuario = (
                SELECT id_usuario FROM facturas WHERE id_factura = $1
             )`,
            [facturaId]
        );

        // Insertar detalles de la factura
        for (const item of carrito.rows) {
            const cantidad = parseInt(item.cantidad, 10); // Asegurar que sea un entero
            if (isNaN(cantidad)) {
                throw new Error(`Cantidad inválida para id_subservicio: ${item.id_subservicio}`);
            }

            await pool.query(
                `INSERT INTO detalle_facturas (id_factura, id_subservicio, cantidad, precio_unitario)
                 VALUES (
                     $1, 
                     $2, 
                     $3, 
                     (SELECT precio FROM subservicios WHERE id_subservicio = $2)::numeric
                 )`,
                [facturaId, item.id_subservicio, cantidad]
            );
        }

        // Calcular el total
        let total = 0;
        for (const item of carrito.rows) {
            const precioResult = await pool.query(
                `SELECT precio FROM subservicios WHERE id_subservicio = $1`,
                [item.id_subservicio]
            );
            const precio = parseFloat(precioResult.rows[0].precio);
            const cantidad = parseInt(item.cantidad, 10);

            if (isNaN(precio) || isNaN(cantidad)) {
                throw new Error(
                    `Datos inválidos en el cálculo de total: precio=${precio}, cantidad=${cantidad}`
                );
            }

            total += precio * cantidad;
        }

        // Calcular el IVA y el total final
        const iva = total * 0.15; // IVA del 15%
        const totalConIva = total + iva;

        // Actualizar la factura con el total y el estado
        await pool.query(
            `UPDATE facturas SET total = $1, estado = 'pagado' WHERE id_factura = $2`,
            [totalConIva, facturaId]
        );

        res.status(200).json({ message: "Factura confirmada exitosamente." });
    } catch (error) {
        console.error("Error al confirmar la factura:", error);
        res.status(500).json({ message: "Error interno al confirmar la factura" });
    }
});

app.post("/cancelar-factura/:facturaId", async (req, res) => {
    const { facturaId } = req.params;

    try {
        await pool.query(
            `UPDATE facturas SET estado = 'cancelado' WHERE id_factura = $1`,
            [facturaId]
        );
        res.status(200).json({ message: "Factura cancelada exitosamente." });
    } catch (error) {
        console.error("Error al cancelar la factura:", error);
        res.status(500).json({ message: "Error interno al cancelar la factura" });
    }
});



// Exporta la app para el servidor principal (si es necesario)
module.exports = app;

// Iniciar el servidor


const PORTA = process.env.PORT || 3000; // Usa el puerto asignado por Railway o 3000 como fallback.
app.listen(PORTA, () => {
    console.log(`Servidor escuchando en el puerto ${PORTA}`);
});

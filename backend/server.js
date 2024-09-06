const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const cors = require("cors"); // Importamos CORS para habilitarlo
const app = express();

// Habilitar CORS para que cualquier origen pueda hacer peticiones al backend
app.use(cors());

app.use(express.json());

// Conectar a la base de datos SQLite
const dbPath = path.resolve(__dirname, "vivero.sqlite");
const db = new sqlite3.Database(dbPath);

// Crear la tabla si no existe, asegurando que `tag_unico` sea único
db.run(`
    CREATE TABLE IF NOT EXISTS Plantas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tag_unico TEXT NOT NULL UNIQUE,  -- Aseguramos que el campo sea único
        especie TEXT,
        fecha_germinacion TEXT,
        condiciones_crecimiento TEXT,
        fecha_registro TEXT DEFAULT CURRENT_TIMESTAMP
    )
`);

// Ruta para registrar una nueva planta (POST /planta)
app.post("/planta", (req, res) => {
  const { tag_unico, especie, fecha_germinacion, condiciones_crecimiento } =
    req.body;

  const query = `
        INSERT INTO Plantas (tag_unico, especie, fecha_germinacion, condiciones_crecimiento)
        VALUES (?, ?, ?, ?)
    `;

  // Ejecutar la inserción y manejar posibles errores de duplicación de `tag_unico`
  db.run(
    query,
    [tag_unico, especie, fecha_germinacion, condiciones_crecimiento],
    function (err) {
      if (err) {
        // Verificar si el error es debido a la restricción UNIQUE en `tag_unico`
        if (err.message.includes("UNIQUE constraint failed")) {
          return res
            .status(400)
            .json({ error: "El tag único ya está registrado. Ingrese un nuevo valor." });
        }
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id: this.lastID });
    }
  );
});

// Ruta para obtener detalles de una planta por su tag (GET /planta/:tag_unico)
app.get("/planta/:tag_unico", (req, res) => {
  const { tag_unico } = req.params;

  const query = "SELECT * FROM Plantas WHERE tag_unico = ?";

  db.get(query, [tag_unico], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: "Planta no encontrada" });
    }
    res.json(row);
  });
});

// Ruta para obtener todos los tags únicos para autocompletar (GET /tags)
app.get("/tags", (req, res) => {
  const query = "SELECT tag_unico FROM Plantas";

  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    // Extraer los tags únicos en un array
    const tags = rows.map((row) => row.tag_unico);
    res.json(tags);
  });
});

// Iniciar el servidor en el puerto 3000
app.listen(3000, () => {
  console.log("Servidor corriendo en el puerto 3000");
});

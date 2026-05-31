const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const PDFDocument = require("pdfkit");

// Inicializamos el cliente de S3. AWS toma las credenciales del rol automáticamente.
const s3 = new S3Client({ region: "us-east-1" });

exports.handler = async (event) => {
  try {
    console.log("Evento recibido desde RabbitMQ:", JSON.stringify(event));

    // 1. Obtener la data de los empleados (Viene en el cuerpo del mensaje/evento)
    // Si el evento viene de RabbitMQ estructurado, lo parseamos.
    const msgBody = event.body ? JSON.parse(event.body) : event;
    const reportId = msgBody.reportId || `reporte-${Date.now()}`;
    const employees = msgBody.employees || [
      { id: 1, name: "Matias Torres", role: "Cloud Architect & Dev" },
      { id: 2, name: "Sistemas Test", role: "Backend Microservice" },
    ];

    console.log(
      `Generando reporte ID: ${reportId} con ${employees.length} empleados.`,
    );

    // 2. Crear el PDF en memoria usando Streams y Promises
    const pdfBuffer = await new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      let buffers = [];

      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      // --- DISEÑO DEL PDF ---
      doc
        .fillColor("#1A365D")
        .fontSize(24)
        .text("INFORME DE EMPLEADOS", { align: "center" });
      doc
        .fontSize(10)
        .fillColor("#718096")
        .text(`Generado el: ${new Date().toLocaleString()}`, {
          align: "center",
        });
      doc.moveDown(2);

      // Línea divisoria
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke("#CBD5E0");
      doc.moveDown(1.5);

      // Tabla / Lista de empleados
      employees.forEach((emp) => {
        // 1. Buscamos el ID (puede venir como 'id' o 'emp_no' desde tu repositorio)
        const empId = emp.id || emp.emp_no || "N/A";

        // 2. Armamos el nombre unificando first_name y last_name, o usamos 'name' si viene plano
        const empName =
          emp.name ||
          (emp.first_name
            ? `${emp.first_name} ${emp.last_name || ""}`
            : "Sin Nombre");

        // 3. Buscamos el puesto (puede venir como 'role', 'title' o el mapeo que haga tu servicio)
        const empRole = emp.role || emp.title || "Empleado";

        // --- DISEÑO EN EL PDF CON LAS VARIABLES CORREGIDAS ---
        doc
          .fillColor("#2D3748")
          .fontSize(12)
          .text(`ID: ${empId}`, { bold: true });
        doc.fillColor("#4A5568").fontSize(11).text(`Nombre: ${empName}`);
        doc.text(`Puesto: ${empRole}`);
        doc.moveDown(1);

        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke("#E2E8F0");
        doc.moveDown(0.5);
      });

      doc.end();
    });

    // 3. Subir el archivo generado a S3
    // Usamos la variable de entorno BUCKET_NAME que definimos en Terraform
    const bucketName = process.env.BUCKET_NAME;
    const s3Key = `reportes/${reportId}.pdf`;

    await s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
        Body: pdfBuffer,
        ContentType: "application/pdf",
      }),
    );

    console.log(`PDF subido exitosamente a S3 en: ${s3Key}`);

    // 4. Retornamos la respuesta del éxito del procesamiento
    return {
      statusCode: 200,
      body: JSON.stringify({
        status: "COMPLETED",
        reportId: reportId,
        s3Path: s3Key,
        url: `https://${bucketName}.s3.amazonaws.com/${s3Key}`,
      }),
    };
  } catch (error) {
    console.error("Error crítico en la Lambda de reportes:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ status: "FAILED", error: error.message }),
    };
  }
};

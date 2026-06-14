# 👥 PDF Generator Microservice (pdf_generator_employees)

<p align="center">
  <img src="https://img.shields.io/badge/node.js-v18.x-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js version" />
  <img src="https://img.shields.io/badge/pdfkit-v0.15.x-FF6F00?style=for-the-badge&logo=pdfkit&logoColor=white" alt="PDFKit version" />
  <img src="https://img.shields.io/badge/aws--sdk--s3-v3.x-232F3E?style=for-the-badge&logo=amazonwebservices&logoColor=white" alt="AWS SDK S3" />
</p>

---

## 📝 Description

This component is a serverless microservice designed to run as an **AWS Lambda function** (`generador-reportes-pdf`). Its core responsibility is to generate formatted PDF employee reports dynamically and store them securely in **Amazon S3** for public retrieval.

It is built on **Node.js**, using **PDFKit** for in-memory stream-based PDF generation, and the native **AWS SDK for JavaScript v3** to upload files.

---

## 🔗 Connected Repositories

This project belongs to a multi-repository microservices ecosystem. Ensure you have all repositories cloned for full integration:

*   **API Gateway:** [employees_api_gateway](https://github.com/MNATorres/employees_api_gateway.git)
*   **Departments Microservice:** [departments_ms](https://github.com/MNATorres/departments_ms.git)
*   **Employees Microservice:** [employees_ms](https://github.com/MNATorres/employees_ms.git)
*   **PDF Generator (AWS Lambda - This repo):** [pdf_generator_employees](https://github.com/MNATorres/pdf_generator_employees.git)
*   **Reports Infrastructure (Terraform):** [reports_infra_ms](https://github.com/MNATorres/reports_infra_ms.git)

---

## 🏗️ System Architecture & Message Flow

The architecture consists of several microservices cooperating over synchronous proxy requests, asynchronous RabbitMQ event streaming, and serverless PDF generation in the cloud.

```mermaid
graph TD
    Client[📱 Cliente / Postman] -->|HTTP Request| GW[🔀 API Gateway: Port 8081]
    
    %% Proxies
    GW -->|/api/departments/*| MS_Dept[🏢 Departments MS: Port 3001]
    GW -->|/api/employees/*| MS_Emp[👥 Employees MS: Port 3000]
    
    %% Databases locales
    MS_Dept -->|Write / Read| DB_Dept[(💾 Departments MySQL DB: Port 3307 <br> - departments table)]
    MS_Emp -->|Write / Read| DB_Emp[(💾 Employees MySQL DB: Port 3306 <br> - employees, salaries, titles <br> - departments_cache table)]
    
    %% Pub/Sub
    MS_Dept -->|1. Publish: DEPARTMENT_CREATED| RMQ[🐇 RabbitMQ Broker: Port 5672]
    RMQ -->|2. Consume Event| MS_Emp
    
    %% Reportes
    MS_Emp -->|4. Publish: reportId & employees| RMQ
    RMQ -.->|5. Trigger Lambda| Lambda["⚡ AWS Lambda: pdf_generator_employees<br>📍 YOU ARE HERE"]
    
    %% AWS Infra
    Infra[🏗️ Reports Infra: Terraform] -.->|Deploys| Lambda
    Infra -.->|Deploys| S3[🪣 AWS S3: practica-reportes-s3-matias-2026]
    Lambda -->|6. Upload PDF| S3

    classDef current fill:#ffcc00,stroke:#ff6600,stroke-width:4px,color:#000000;
    classDef gateway fill:#1f6feb,stroke:#58a6ff,stroke-width:2px,color:#ffffff;
    classDef service fill:#238636,stroke:#2ea043,stroke-width:1px,color:#ffffff;
    classDef database fill:#4479A1,stroke:#005F9E,stroke-width:2px,color:#ffffff;
    classDef broker fill:#d2691e,stroke:#ff8c00,stroke-width:2px,color:#ffffff;
    classDef aws fill:#e05c2b,stroke:#ff9900,stroke-width:2px,color:#ffffff;
    
    class Lambda current;
    class GW,MS_Emp,MS_Dept service;
    class DB_Dept,DB_Emp database;
    class RMQ broker;
    class S3,Infra aws;
```

---

## ✨ Features

*   **Serverless Execution:** Completely stateless, runs on demand on AWS Lambda.
*   **In-Memory PDF Design:** Generates reports with professional aesthetics (headers, dividers, customized styles) without using temporary local files.
*   **Automated S3 Upload:** Automatically uploads the resulting `.pdf` document to Amazon S3 with proper content-type headers so it can be streamed directly in browsers.
*   **Dual Payload Parser:** Can parse incoming payloads directly from direct AWS Lambda invocations or via proxy events (e.g. from API Gateway / SQS / RabbitMQ queues).

---

## 🚀 Execution & Packaging

### Event Structure (Payload)

The handler expects a JSON payload containing the report metadata and employee array:

```json
{
  "reportId": "sales-report-2026",
  "employees": [
    {
      "id": 1,
      "name": "Matias Torres",
      "role": "Cloud Architect & Dev"
    }
  ]
}
```

### Deployment

This code is packaged into a `.zip` file and deployed to AWS Lambda via Terraform from the sister project [reports_infra_ms](https://github.com/MNATorres/reports_infra_ms.git).

Ensure you run `npm install` inside this folder before deploying through Terraform, so that the required dependencies (`pdfkit` and `@aws-sdk/client-s3`) are packed together with the handler code.

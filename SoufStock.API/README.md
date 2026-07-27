# SoufStock ERP API

## Overview
SoufStock ERP API is an enterprise-grade RESTful Web API built with ASP.NET Core 9.0. It provides the backend services for the SoufStock Enterprise Resource Planning (ERP) and Warehouse Management System (WMS).

## Project Structure

```
SoufStock.API/
├── Controllers/          # API endpoint controllers
├── Models/               # Domain models
├── DTOs/                 # Data Transfer Objects
├── Services/             # Business logic services
├── Repositories/         # Data access layer
├── Interfaces/           # Service and repository interfaces
├── Data/                 # Database context and migrations
├── Middleware/           # Custom middleware
├── Helpers/              # Utility helper classes
├── Authorization/        # Authorization and authentication
├── Extensions/           # Extension methods
├── Configurations/       # Configuration classes
├── Mapping/              # AutoMapper profiles
├── Logs/                 # Application logs
├── Properties/           # Project properties
├── wwwroot/              # Static files
│   ├── assets/           # Static assets
│   ├── pages/            # Static pages
│   └── import/           # Import files
├── Program.cs            # Application entry point
├── Startup.cs            # Startup configuration
├── appsettings.json      # Application settings
└── appsettings.Development.json  # Development settings
```

## Getting Started

### Prerequisites
- .NET 9.0 SDK or later
- Visual Studio 2022 or Visual Studio Code
- SQL Server (or compatible database)

### Installation

1. Navigate to the project directory:
   ```bash
   cd SoufStock.API
   ```

2. Restore NuGet packages:
   ```bash
   dotnet restore
   ```

3. Update the connection string in `appsettings.json`

4. Apply database migrations (when available):
   ```bash
   dotnet ef database update
   ```

### Running the Application

```bash
dotnet run
```

The API will be available at `https://localhost:7000` or `http://localhost:5000`

### Swagger Documentation

Once the application is running, access the Swagger documentation at:
- `https://localhost:7000/swagger` (HTTPS)
- `http://localhost:5000/swagger` (HTTP)

## Technologies

- **Framework**: ASP.NET Core 9.0
- **Language**: C# 13.0
- **API Documentation**: Swagger/OpenAPI
- **Database**: SQL Server (configurable)

## Features (Planned)

- RESTful API endpoints
- Role-based authorization (RBAC)
- Data validation and error handling
- Comprehensive logging
- CORS support

## Configuration

### Connection Strings
Update the connection string in `appsettings.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=.;Database=SoufStockDB;Trusted_Connection=true;TrustServerCertificate=true;"
  }
}
```

### Logging
Configure logging levels in `appsettings.json`:

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  }
}
```

## Development

### Project Conventions
- Controllers: Follow RESTful naming conventions
- Services: Implement dependency injection
- Models: Use entity attributes for database mapping
- DTOs: Separate API contracts from domain models

## License

This project is part of the SoufStock ERP suite.

## Support

For issues and feature requests, please refer to the main repository documentation.

<!-- markdownlint-disable MD033 -->

# Laravel Multi-Tenant ERP API
<p align="center"><a href="https://laravel.com" target="_blank" rel="noopener noreferrer"><img src="https://raw.githubusercontent.com/laravel/art/master/logo-lockup/5%20SVG/2%20CMYK/1%20Full%20Color/laravel-logolockup-cmyk-red.svg" width="400" alt="Laravel Logo"></a></p>

This project serves as the robust backend API for a modern, multi-tenant Enterprise Resource Planning (ERP) application. Developed with Laravel, it incorporates a sophisticated policy-based authorization system and is engineered to support multiple companies on a single platform, ensuring data isolation for each tenant.

## Table of Contents
- [Core Features](#core-features)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Database Seeding](#database-seeding)
- [API Testing Guide](#api-testing-guide)
  - [Postman Setup](#postman-setup)
  - [Test Credentials](#test-credentials)
- [API Endpoints](#api-endpoints)
  - [Authentication](#authentication)
  - [Human Resource Management (HRM)](#human-resource-management-hrm)
  - [Customer Relationship Management (CRM)](#customer-relationship-management-crm)
  - [Inventory Management](#inventory-management)
  - [Purchasing Management](#purchasing-management)
  - [Sales Management](#sales-management)
- [Future Development](#future-development)
- [License](#license)

## Core Features

- **Authentication**: Secure, token-based authentication (Login, Logout, Refresh) using Laravel Sanctum.
- **Multi-Tenancy Architecture**: Supports multiple companies on a single platform, with data automatically isolated for each tenant.
- **Flexible Permission System**: Granular access control is managed by assigning permissions (e.g., `manage-products`, `create-sales`) to job titles, not just broad user roles.
- **Human Resource Management (HRM)**: A comprehensive module for managing departments, job titles, and the complete employee lifecycle (hiring, profile updates, status changes, and termination) with detailed access policies.
- **Inventory Management**: Full CRUD management of products and categories. Features a `StockMovement` system for a complete, traceable audit trail of all inventory changes.
- **Customer Relationship Management (CRM)**: Endpoints for managing both Customers and Suppliers, secured by tenant-aware authorization policies.
- **Purchasing Management**: A complete workflow to create and manage purchase orders, automatically increasing product stock levels upon receipt.
- **Sales Management**: A complete workflow to create and manage sales orders, automatically decreasing product stock levels and preventing sales of out-of-stock items.
- **Data Integrity**: Widespread use of soft deletes ensures that critical records like employees, products, and customers are archived instead of being permanently deleted, preserving historical data.

## Getting Started

Follow these instructions to get the project up and running on your local machine.

### Prerequisites

- PHP >= 8.2
- Composer
- A database server (e.g., MySQL, MariaDB)
- An API client like Postman for testing.

### Installation

1.  **Clone the repository and navigate into it:**
    ```sh
    git clone <your-repository-url>
    cd erp-api-backend
    ```

2.  **Install dependencies:**
    ```sh
    composer install
    ```

3.  **Set up environment file:**
    ```sh
    cp .env.example .env
    ```

4.  **Generate app key:**
    ```sh
    php artisan key:generate
    ```

5.  **Configure your database** in the `.env` file (`DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`).

6.  **Run database migrations:** This command creates all tables.
    ```sh
    php artisan migrate
    ```

### Database Seeding

This single command populates the database with a complete and realistic set of test data for multiple companies, including users with different roles and permissions.

```sh
php artisan migrate:fresh --seed
```

---

## API Testing Guide

### Postman Setup

1.  Create a Postman environment variable `{{base_url}}` and set it to `http://127.0.0.1:8000/api`.
2.  Create environment variables `{{auth_token}}` and `{{refresh_token}}` to store tokens after login.

### Test Credentials

The seeder creates multiple roles. Use these to test the access policies.

- **Owner**: `owner@globaltech.com` / `password` (Full access)
- **Manager**: Hire a user with the "Manager" job title. They can manage products, customers, and purchasing.
- **Sales Rep**: Hire a user with the "Sales Representative" job title. They can only create sales.

## API Endpoints

All protected routes require an `Authorization: Bearer {{auth_token}}` header.

### Authentication

#### Login
- **Request**: `POST {{base_url}}/login`
- **Body**:
  ```json
  {
    "email": "owner@globaltech.com",
    "password": "password"
  }
  ```
- **Action**: Save the `access_token` and `refresh_token` from the response.

#### Refresh Token
- **Request**: `POST {{base_url}}/refresh`
- **Authorization**: `Bearer Token {{refresh_token}}`

### Human Resource Management (HRM)

#### Departments (`/departments`)
- **List**: `GET {{base_url}}/departments`
- **Create**: `POST {{base_url}}/departments` (Admin/Owner only)

#### Job Titles (`/job-titles`)
- **List**: `GET {{base_url}}/job-titles`
- **Create**: `POST {{base_url}}/job-titles` (Admin/Owner only)

#### Employees (`/employees`)
- **List**: `GET {{base_url}}/employees`
- **Hire**: `POST {{base_url}}/employees` (Admin/Owner only)
- **Update**: `PUT {{base_url}}/employees/{id}` (Permissions vary by role)
- **Terminate**: `DELETE {{base_url}}/employees/{id}` (Admin/Owner only)

### Customer Relationship Management (CRM)

#### Customers (`/customers`)
- **List**: `GET {{base_url}}/customers`
- **Create**: `POST {{base_url}}/customers` (Requires `manage-customers` permission)
- **Update**: `PUT {{base_url}}/customers/{id}` (Requires `manage-customers` permission)
- **Delete**: `DELETE {{base_url}}/customers/{id}` (Requires `manage-customers` permission)

#### Suppliers (`/suppliers`)
- **List**: `GET {{base_url}}/suppliers`
- **Create**: `POST {{base_url}}/suppliers` (Requires `manage-purchasing` permission)
- **Update**: `PUT {{base_url}}/suppliers/{id}` (Requires `manage-purchasing` permission)
- **Delete**: `DELETE {{base_url}}/suppliers/{id}` (Requires `manage-purchasing` permission)

### Inventory Management

#### Products (`/products`)
- **List**: `GET {{base_url}}/products`
- **Create**: `POST {{base_url}}/products` (Requires `manage-products` permission)
- **Update**: `PUT {{base_url}}/products/{id}` (Requires `manage-products` permission)
- **Delete**: `DELETE {{base_url}}/products/{id}` (Requires `manage-products` permission)

### Purchasing Management

#### Create Purchase Order
- **Request**: `POST {{base_url}}/purchase-orders`
- **Permission**: `manage-purchasing`
- **Body**:
  ```json
  {
      "supplier_id": 1,
      "order_date": "2025-10-15",
      "items": [
          {"product_id": 1, "quantity": 50, "unit_cost": "150.00"}
      ]
  }
  ```

#### Receive Purchase Order (Increases Stock)
- **Request**: `PUT {{base_url}}/purchase-orders/{id}`
- **Permission**: `manage-purchasing`
- **Body**:
  ```json
  {
      "status": "RECEIVED"
  }
  ```

### Sales Management

#### Create Sales Order (Decreases Stock)
- **Request**: `POST {{base_url}}/sales`
- **Permission**: `create-sales`
- **Body**:
  ```json
  {
      "customer_id": 1,
      "order_date": "2025-10-16",
      "items": [
          {"product_id": 1, "quantity": 5}
      ]
  }
  ```

## Future Development

This section can be used to outline the future roadmap for the project, including planned features, modules, or enhancements.

- **Accounting Module**: Integration with financial ledgers, invoicing, and payment tracking.
- **Reporting & Analytics**: Advanced dashboards for business intelligence.
- **API Documentation**: Generation of OpenAPI (Swagger) documentation.

## License

The Laravel framework is open-sourced software licensed under the MIT license.

# StageAlpha — Local Setup Guide

Welcome to **StageAlpha**, an event logistics and equipment rental management platform! This guide will walk you through setting up the project on your local machine.

---

## 🛠️ Prerequisites
Before diving in, make sure you have the following installed on your machine:
1. **Node.js**: v18 or higher ([Download Node.js](https://nodejs.org/))
2. **PostgreSQL**: v14 or higher ([Download PostgreSQL](https://www.postgresql.org/download/))
3. **Redis** *(Optional but recommended)*: Used for caching performance. ([Download Redis](https://redis.io/download/))
4. **Git**: To clone the repository.

---

## 🚀 1. Repository Setup

Clone the project to your local machine:
```bash
# Clone the repository
git clone <your-repository-url> stageAlpha

# Navigate into the project folder
cd stageAlpha

# Install the Node.js dependencies
npm install
```

---

## 🗄️ 2. Environment Configuration

The application requires environment variables to connect to your database and manage security tokens.

1. In the `stageAlpha` root directory, simply copy the `.env.example` file to create your own configuration blueprint manually or execute:
   ```bash
   cp .env.example .env
   ```
2. Open the `.env` file in your code editor. Update the default `DATABASE_URL` line to match your own local PostgreSQL setup (e.g., if you have a different username or password).

**Example `.env` excerpt:**
```ini
# PostgreSQL connection string
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/stagealpha

# Randomly generate your own JWT secrets
JWT_SECRET=super-secret-key-development
JWT_REFRESH_SECRET=another-super-secret-key
```

---

## 🗃️ 3. Database Initialization

You need to create the database in PostgreSQL and populate it with tables and starter data.

1. Open your terminal or `psql` shell and create the new empty database:
   ```sql
   CREATE DATABASE stagealpha;
   ```
2. The project contains built-in JS migration scripts to automate the entire database build. Run the following command lines:
   ```bash
   # Initialize the database (builds the schema, views, and functions)
   npm run db:init

   # Seed the database with realistic sample data (equipment, test clients, packages)
   npm run db:seed
   ```

*Note: If you ever need to reset the database back to square one, you can run `npm run db:reset`.*

---

## 🏃 4. Running the Application

With the code installed and the database successfully seeded, it's time to start up the server!

**Development Mode (Live Reloading Enabled)**
```bash
npm run dev
```

**Production Mode**
```bash
npm start
```

If everything is configured securely, your terminal will display:
```
StageAlpha running on port 3000 [development]
```

---

## 🌐 5. Accessing the Platform

StageAlpha operates fully autonomously. Open your web browser and navigate directly to:
**[http://localhost:3000](http://localhost:3000)**

### 🔑 Default Login Credentials
Because you effectively seeded the database with test files, you can log in immediately using these roles:

**Admin Account**
- **Email:** `admin@stagealpha.com`
- **Password:** `password` 

**Test Customer Account**
- **Email:** `rajesh.sharma@gmail.com`
- **Password:** `password` 

---

## 🛑 Typical Troubleshooting Checks

- **`ECONNREFUSED` / Database Error**: Ensure your PostgreSQL background service is actively running and the connection credentials inside your `.env` perfectly match.
- **Node Modules Compilation Error**: If you face any unknown import errors, delete your `node_modules` folder, clear your package lock, and run `npm install` again.

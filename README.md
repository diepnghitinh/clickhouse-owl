# ClickHouse Owl 🦉

Modern admin management interface for ClickHouse databases.

## Overview

ClickHouse Owl is a beautiful, modern web-based admin interface for managing ClickHouse databases. It provides an intuitive UI for executing queries, managing databases and tables, and monitoring system activity.

## Features

- **📊 Dashboard** - Overview of databases, tables, and system status
- **💾 Database Management** - Create and manage multiple databases
- **📋 Table Management** - Create, view, and drop tables with ease
- **⚡ SQL Editor** - Execute SQL queries with syntax highlighting
- **📈 Real-time Results** - View query results in a responsive data grid
- **🔍 Activity Monitoring** - Track queries, performance metrics, and system health
- **🎨 Modern UI** - Clean, responsive interface with dark mode support

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **HTTP Client**: Axios

## Getting Started

### Prerequisites

- Node.js 18+ (or compatible)
- A running ClickHouse server

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd clickhouse-owl

# Install dependencies
npm install

# Start the development server
npm run dev
```

The application will be available at `http://localhost:5300`

### Build for Production

```bash
npm run build
npm run preview
```

## Configuration

### API Endpoint

The application expects a backend API at `/api` with the following endpoints:

- `POST /api/login` - Authentication
- `POST /api/query` - Execute SQL queries
- `GET /api/databases` - List databases
- `GET /api/tables?db={database}` - List tables in a database

### Default Credentials

Default login credentials (configurable in your backend):
- Username: `default`
- Password: `clickhouse`

## Usage

1. **Login** - Enter your ClickHouse credentials
2. **Dashboard** - View system overview and quick actions
3. **SQL Editor** - Execute custom SQL queries
4. **Tables View** - Browse and manage tables
5. **Create Database/Table** - Use the modal dialogs for creation

## ClickHouse Data Types Support

The application supports all standard ClickHouse data types:

- **Integer**: Int8, Int16, Int32, Int64, UInt8, UInt16, UInt32, UInt64
- **Float**: Float32, Float64
- **Decimal**: Decimal, Decimal32, Decimal64, Decimal128, Decimal256
- **String**: String, FixedString
- **Date/Time**: Date, Date32, DateTime, DateTime64
- **Special**: UUID, IPv4, IPv6, Enum8, Enum16, Array, Tuple, Nullable, LowCardinality, Map, JSON

## Development

### Project Structure

```
src/
├── api/
│   └── client.ts           # API client and data types
├── components/
│   ├── ui/                 # Reusable UI components
│   ├── Dashboard.tsx       # Dashboard view
│   ├── Layout.tsx          # Main layout wrapper
│   ├── Login.tsx           # Login page
│   ├── CreateDatabaseModal.tsx
│   ├── CreateTableModal.tsx
│   ├── CreateRecordModal.tsx
│   └── DropTableModal.tsx
├── lib/
│   └── utils.ts            # Utility functions
├── App.tsx                 # Main application component
└── main.tsx                # Entry point
```

### Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Acknowledgments

Built with modern web technologies and designed for the ClickHouse ecosystem.

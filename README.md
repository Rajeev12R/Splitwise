# Splitify - Splitwise Clone App

Splitify is a simplified, high-fidelity Splitwise-inspired application built for Spreetail's Software Engineering Intern assignment. It allows users to manage shared expenses, track group-wise and individual balances, resolve debts through a transaction minimization engine, and chat in real-time about specific expenses.

## 🚀 Deployed URL & Repositories
*   **Public Deployed App**: [https://splitify-client.vercel.app](https://splitify-client.vercel.app) *(Placeholder)*
*   **GitHub Repository**: [https://github.com/ranjan/splitwise](https://github.com/ranjan/splitwise) *(Placeholder)*

---

## 🛠️ Technology Stack

*   **Frontend**: React (Vite), Tailwind CSS (v4), React Router (v6), TanStack Query, Axios, Lucide React
*   **Backend**: Node.js, Express.js, Socket.io (WebSocket)
*   **Database**: PostgreSQL (Neon Serverless Database)
*   **ORM**: Prisma ORM
*   **Authentication**: JSON Web Tokens (JWT)

---

## 📁 Repository Structure

```
splitwise/
├── backend/                  # Node.js + Express.js backend server
│   ├── lib/                  # Prisma client instance
│   ├── middleware/           # Auth middlewares (JWT check)
│   ├── prisma/               # Schema design & migrations
│   ├── routes/               # API endpoints (Auth, Groups, Expenses, Settlements, Comments)
│   └── index.js              # Entry point & socket configurations
├── docs/                     # Documentation files
│   ├── AI_CONTEXT.md         # Source of truth for recreating this app
│   ├── BUILD_PLAN.md         # Development design decisions & tradeoffs
│   └── splitwise-research.md # Reverse-engineering notes
├── frontend/                 # React + Vite client app
│   ├── src/
│   │   ├── components/       # UI building blocks
│   │   ├── context/          # React Auth session state
│   │   ├── hooks/            # useSocket lifecycle hook
│   │   ├── pages/            # Landing, Login, Register, Dashboard, GroupDetail, ExpenseDetail
│   │   ├── services/         # Axios api client instance
│   │   ├── App.jsx           # App layout & routing guards
│   │   └── index.css         # Styling with Tailwind CSS imports
│   └── vite.config.js        # Vite compilation plugins
└── prompts/
    └── prompts.md            # Key prompts used with AI
```

---

## 💻 Local Setup Instructions

### 1. Prerequisites
Ensure you have the following installed on your machine:
*   [Node.js](https://nodejs.org) (v18 or higher recommended)
*   [npm](https://www.npmjs.com/) (installed automatically with Node)

### 2. Clone the Repository
```bash
git clone https://github.com/ranjan/splitwise.git
cd splitwise
```

### 3. Backend Setup
1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure environment variables. Copy or rename the `.env` template and set your connection parameters:
    ```bash
    cp .env.example .env
    ```
    Inside `.env`, populate your PostgreSQL database connection string and secure token secret:
    ```env
    PORT=3000
    JWT_SECRET=your_jwt_signing_secret_here
    DATABASE_URL="postgresql://<username>:<password>@<host>:<port>/<db_name>?sslmode=require"
    ```
4.  Run Prisma migrations to create the database schemas:
    ```bash
    npx prisma db push
    ```
5.  Start the development server (runs nodemon for auto-reload):
    ```bash
    npm start
    ```
    The server will start on [http://localhost:3000](http://localhost:3000).

### 4. Frontend Setup
1.  Open a new terminal session and navigate to the frontend directory:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure environmental client endpoints by adding a `.env` file (Optional - defaults to local server):
    ```env
    VITE_API_URL="http://localhost:3000/api"
    VITE_SOCKET_URL="http://localhost:3000"
    ```
4.  Start the Vite dev server:
    ```bash
    npm run dev
    ```
    Open your browser and navigate to the local client dashboard at [http://localhost:5173](http://localhost:5173).

---

## 🤖 AI Development Collaboration

This project was built in collaboration with **Gemini 3.5 Flash** (via the Antigravity Agentic IDE) acting as a junior developer.

*   **Role Constraints**: The AI was explicitly instructed not to assume requirements, to refrain from making technical recommendations without consultation, and to maintain `AI_CONTEXT.md` as the absolute source of truth.
*   **Documentation Flow**: Every product decision, database schema design, and UI route was documented in `AI_CONTEXT.md` before any implementation scripts were executed.
*   **Prompts Used**: Refer to [prompts/prompts.md](file:///Users/ranjan/splitwise/prompts/prompts.md) for the exact prompt contexts used to guide the development cycle.

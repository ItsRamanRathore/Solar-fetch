# Contributing to SolarFetch

Welcome to the SolarFetch project! We're excited to have you here. This document provides guidelines for contributing to our smart energy orchestration platform.

## Getting Started

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/ItsRamanRathore/Solar-fetch.git
    cd Solar-fetch
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Set up environment variables**:
    Copy `.env.example` to `.env` and fill in your connection strings.
    ```bash
    cp .env.example .env
    ```

4.  **Run the development server**:
    ```bash
    npm run dev
    ```
    This will start both the Vite frontend and the Express backend concurrently.

## Project Structure

-   `src/`: React frontend code.
    -   `layouts/`: High-level page layouts.
    -   `components/`: Reusable UI components.
    -   `dashboards/`: Role-specific dashboard views.
-   `server/`: Express backend code.
    -   `routes/`: API endpoints.
    -   `models/`: Mongoose schemas.
    -   `engines/`: Business logic and simulation engines.
-   `scripts/`: Database seeding and maintenance scripts.

## Guidelines

-   **Modular Code**: Keep components small and focused. 
-   **Simulation**: Business logic for grid simulation belongs in `server/engines/SimulationEngine.js`.
-   **Styling**: We use Tailwind CSS and Ant Design. Follow the established theme in `src/theme/config.ts`.
-   **Testing**: Run `npm run test` before submitting changes.

## Creating a Pull Request

1.  Create a new branch for your feature or fix.
2.  Commit your changes with clear, descriptive messages.
3.  Ensure all tests and linting pass.
4.  Submit a PR for review.

Thank you for contributing!

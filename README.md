# OpenCoralTools Registry

An open-source data registry for coral restoration, built with Astro and React.

## Features

- **Registers**: Organizations, Coral Species, Genets.
- **Data Storage**: JSON files in `data/` are the source of truth.
- **GitHub Integration**: 
  - Authenticate with a Personal Access Token (PAT).
  - Edit or Add entries via a form-based UI.
  - Commits directly to the repository (if collaborator) or creates a PR (future work).
- **Auto-Sync**: GitHub Action automatically converts JSON to CSV on push.

## Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run Locally**:
   ```bash
   npm run dev
   ```

3. **Authentication**:
   - To edit data, click "Connect GitHub" in the top right.
   - Enter a GitHub Personal Access Token (classic) with `repo` scope.

## Project Structure

- `data/`: JSON source files.
- `src/schemas/`: Zod schemas for data validation.
- `src/components/`: React components (RegistryManager, Navbar).
- `src/pages/`: Astro pages.
- `.github/workflows/`: Actions for CSV sync and Deployment.

## Deployment

This project is configured to deploy to GitHub Pages.
- Push to `main` triggers the deploy workflow.
- Ensure GitHub Pages is enabled in repository settings (Source: GitHub Actions).

## Contributing

1. Fork the repository.
2. Create a feature branch.
3. Make changes (edit JSON files in `data/`).
4. Submit a Pull Request.

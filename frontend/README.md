# MOP Generation Frontend

This is the frontend application for the MOP (Method of Procedure) Generation system. It provides a user interface for uploading network specification documents, generating MOPs, and managing users.

## Project Structure

```
frontend/
├── public/                 # Public assets
├── src/                    # Source code
│   ├── assets/             # Static assets (images, icons, etc.)
│   ├── components/         # Reusable UI components
│   ├── hooks/              # Custom React hooks
│   ├── pages/              # Page components
│   ├── services/           # API services
│   ├── store/              # Redux store
│   │   ├── index.ts        # Store configuration
│   │   └── slices/         # Redux slices
│   ├── utils/              # Utility functions
│   ├── App.tsx             # Main App component
│   ├── index.tsx           # Entry point
│   ├── index.css           # Global styles
│   └── theme.ts            # Material UI theme configuration
├── package.json            # Dependencies and scripts
└── tsconfig.json           # TypeScript configuration
```

## Features

- **Authentication**: Login and registration functionality
- **Dashboard**: Overview of recent documents and MOPs
- **Document Management**: Upload, view, and manage network specification documents
- **MOP Editor**: Create, edit, and export Method of Procedure documents
- **User Management**: Admin interface for managing users and roles
- **Settings**: Application configuration

## Technologies Used

- React 18
- TypeScript
- Redux Toolkit for state management
- React Router for navigation
- Material UI for UI components
- Axios for API requests
- Formik and Yup for form validation

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Navigate to the frontend directory:
   ```
   cd mop-gen/frontend
   ```
3. Install dependencies:
   ```
   npm install
   ```
   or
   ```
   yarn install
   ```

### Running the Development Server

```
npm start
```
or
```
yarn start
```

This will start the development server at [http://localhost:3000](http://localhost:3000).

### Building for Production

```
npm run build
```
or
```
yarn build
```

This will create an optimized production build in the `build` directory.

## API Integration

The frontend communicates with the backend API for all data operations. The API base URL is configured in the `package.json` file using the `proxy` field for development, and should be set in environment variables for production.

## Authentication

The application uses JWT (JSON Web Tokens) for authentication. The token is stored in localStorage and included in the Authorization header for API requests.

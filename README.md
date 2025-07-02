# Anomaly Live Dashboard

A modern React-based web application for real-time anomaly tracking and AI-powered analysis. This dashboard provides comprehensive monitoring capabilities with an intuitive interface for detecting and analyzing system anomalies.

## 🚀 Features

- **Real-time Monitoring**: Live anomaly detection and tracking
- **AI-Powered Analysis**: Intelligent anomaly classification and insights
- **Interactive Dashboard**: Responsive UI with real-time data visualization
- **Real-time Updates**: Socket.IO integration for live data streaming
- **Modern UI**: Built with shadcn/ui components and Tailwind CSS
- **Docker Support**: Containerized deployment ready

## 🛠️ Tech Stack

- **Frontend Framework**: React + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Real-time Communication**: Socket.IO
- **Containerization**: Docker

## 📁 Project Structure

```
anomaly-live-dashboard/
├── public/
│   ├── AIstar.svg
│   ├── alert.svg
│   └── ... (other SVG assets)
├── src/
│   ├── components/
│   │   ├── modals/
│   │   │   └── AiModal.jsx
│   │   └── ... (other components)
│   └── ... (other source files)
├── .dockerignore
├── .env
├── .gitignore
├── components.json
├── Dockerfile
├── eslint.config.js
├── index.html
├── jsconfig.json
├── package.json
├── README.md
└── vite.config.js
```

## 🚦 Getting Started

### Prerequisites

Before running this project, make sure you have the following installed:

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **Git**

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Team-Supervaisor/Anomaly-live-dashboard.git
   cd Anomaly-live-dashboard
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Environment Setup:**
   - Copy the `.env.example` file to `.env` (if available)
   - Configure your environment variables as needed

## 🔧 Development

### Running the Development Server

Start the development server with hot reload:

```bash
npm run dev
# or
yarn dev
```

The application will be available at `http://localhost:5173` (or the port specified in your Vite config).

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Create production build
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint for code quality checks

## 🏗️ Building for Production

### Local Build

To create a production build:

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

### Docker Deployment

Build and run with Docker:

```bash
# Build the Docker image
docker build -t anomaly-dashboard .

# Run the container
docker run -p 3000:3000 anomaly-dashboard
```

## 🔌 Socket.IO Integration

This application uses Socket.IO for real-time communication. Make sure your backend Socket.IO server is running and properly configured to work with this dashboard.

## 🎨 UI Components

The project uses shadcn/ui components for a consistent and modern interface. Component configurations can be found in `components.json`.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request


## 🐛 Issues & Support

If you encounter any issues or need support, please:

1. Check the [existing issues](https://github.com/Team-Supervaisor/Anomaly-live-dashboard/issues)
2. Create a new issue with detailed information about the problem
3. Include steps to reproduce the issue




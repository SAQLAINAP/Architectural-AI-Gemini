## 🚀 Overview

The **Architectural AI Agent** is a cutting-edge web application designed to assist architects, home builders, and enthusiasts in the initial stages of building design. By leveraging Google's **Gemini AI**, the application generates detailed floor plans, provides comprehensive material and cost estimates, and checks for compliance with local building codes and cultural design principles (like Vastu Shastra).

## ✨ Key Features

-   **AI-Powered Floor Plan Generation**: Generate optimized floor plans based on plot dimensions, requirements, and family size.
-   **Intelligent Material & Cost Estimation**: Get detailed cost breakdowns with multi-tier quotations (Basic, Premium, Luxury) and visual cost distribution charts.
-   **Regulatory & Cultural Compliance**: Automatically checks designs against local building codes (e.g., NBC, BBMP) and cultural guidelines (Vastu, Islamic beliefs).
-   **Interactive Stepper Interface**: User-friendly, step-by-step configuration for accurate project inputs.
-   **History & Cloud Storage**: Save and retrieve your estimates and projects securely using Supabase authentication and storage.
-   **Visualizations**: Interactive charts and detailed tables for financial planning.

## 🛠️ Tech Stack

-   **Frontend**: React, TypeScript, Vite, Tailwind CSS
-   **AI Integration**: Google Gemini Pro (via `@google/genai`)
-   **Backend/Storage**: Supabase (Auth & Database)
-   **Routing**: React Router DOM
-   **Visualization**: Recharts
-   **Icons**: Lucide React

## 🏁 Getting Started

Follow these steps to set up the project locally.

### Prerequisites

-   **Node.js** (v18 or higher)
-   **npm** or **yarn**
-   A **Google Gemini API Key**
-   A **Supabase** Project (URL and Anon Key)

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/SAQLAINAP/Architectural_Gemini.git
    cd Architectural_Gemini
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Configure Environment Variables**:
    Create a `.env.local` file in the root directory and add your keys:
    ```env
    VITE_GEMINI_API_KEY=your_gemini_api_key_here
    VITE_SUPABASE_URL=your_supabase_project_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```
    
    > **Note**: This project uses Vite, so environment variables must be prefixed with `VITE_`
    VITE_SUPABASE_URL=your_supabase_project_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

4.  **Run the development server**:
    ```bash
    npm run dev
    ```

5.  **Open the app**:
    Visit `http://localhost:5173` in your browser.

## 📂 Project Structure

```
src/
├── components/     # Reusable UI components (NeoComponents, etc.)
├── contexts/       # React Contexts (AuthContext)
├── lib/            # Library configurations (Supabase client)
├── services/       # API services (Gemini AI, Storage)
├── views/          # Page components (Home, Configuration, MaterialCostEstimation)
├── types.ts        # TypeScript interfaces and types
├── App.tsx         # Main application component with routing
└── main.tsx        # Entry point
```

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
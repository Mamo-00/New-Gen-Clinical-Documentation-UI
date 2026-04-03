# Medical Journal System

A comprehensive, AI-powered medical journal system designed specifically for pathology laboratories, with a focus on colorectal screening (tarmscreening) and polyp analysis. Built with React, TypeScript, and modern web technologies.

The demo for it is live but you need **login credentials** to access it which you can find at the bottom of this documentation.

## 🏥 Overview

This system streamlines the process of creating medical reports for pathology samples, particularly focusing on:
- **Colorectal screening samples** (tarmscreening)
- **Polyp analysis** (polypp)
- **AI-assisted diagnosis generation**
- **Template-based report creation**
- **Multi-language spell checking** (Norwegian Bokmål/Nynorsk)

## ✨ Key Features

### 🔬 Medical Report Creation
- **Macroscopic Description Editor**: Rich text editor for macroscopic findings
- **Microscopic Description Editor**: Specialized interface for microscopic analysis
- **Diagnosis/Conclusion Editor**: AI-assisted diagnosis generation
- **Template System**: Pre-built templates for common sample types

### 🤖 AI Integration
- **Multiple AI Providers**: Support for HuggingFace, OpenAI, Anthropic, DeepSeek, and more
- **Local Inference**: Option to run AI models locally for privacy
- **Diagnosis Generation**: AI-powered diagnosis suggestions based on macroscopic and microscopic descriptions
- **Configurable Models**: Choose from various language models optimized for medical text

### 📝 Smart Templates
- **Dynamic Tree Interface**: Hierarchical form-based template filling
- **Conditional Fields**: Smart form fields that appear based on selections
- **Auto-completion**: Medical terminology suggestions with context awareness
- **Template Categories**:
  - **Polyp Templates**: POLY_1, POLY_2, POLY_3, POLY_4
  - **Colorectal Screening Templates**: TARM_1 through TARM_10

### 🔍 Advanced Editing Features
- **CodeMirror Integration**: Professional-grade text editing
- **Spell Checking**: Norwegian language support with Hunspell
- **Custom Dictionaries**: User-specific medical terminology
- **Auto-save**: Automatic content preservation
- **Undo/Redo**: Full editing history support

### 🎯 Specialized Medical Interface
- **TarmScreening UI**: Step-by-step microscopic analysis interface
- **Medical Completions**: Context-aware medical term suggestions
- **Sample Information Display**: Patient and sample metadata
- **Priority Indicators**: CITO and routine sample handling

## 🎯 Core Functionalities

• **Intelligent Medical Autocomplete**: Context-aware suggestions for medical terminology that adapts to the specific pathology field and user preferences, enhancing typing efficiency and terminology accuracy.

• **Template-Based Report Generation**: Dynamic template system with keyword-triggered snippet insertion, allowing pathologists to quickly insert standardized text blocks and structured templates for different sample types.

• **Guided Diagnostic Workflow**: Interactive step-by-step interface that guides pathologists through systematic diagnostic processes, automatically generating descriptive text based on structured selections and checkboxes - similar to a software installation wizard.

• **AI-Powered Diagnosis Assistant**: Integrated language model module that analyzes macroscopic and microscopic descriptions to automatically generate diagnostic suggestions, helping pathologists formulate comprehensive and accurate conclusions.

## 🛠️ Technology Stack

### Frontend
- **React 18.3.1** with TypeScript
- **Material-UI (MUI) 6.4.8** for UI components
- **Redux Toolkit** for state management
- **React Router** for navigation
- **CodeMirror 6** for text editing

### AI & Machine Learning
- **HuggingFace Inference API** for remote AI models
- **Transformers.js** for local model inference
- **Multiple AI Providers**: OpenAI, Anthropic, DeepSeek, Llama, Ollama, Gemini

### Backend & Storage
- **Firebase** for authentication and data storage
- **Firestore** for document storage
- **Firebase Auth** for user management

### Spell Checking & Language
- **Hunspell** for Norwegian spell checking
- **Nspell** for additional spell checking capabilities
- **Norwegian Dictionaries**: Bokmål (nb_NO) and Nynorsk (nn_NO)

### Development Tools
- **Vite** for build tooling
- **ESLint** for code quality
- **Vitest** for testing
- **TypeScript** for type safety

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Firebase project (for authentication and storage)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd new-gen-medical-journal-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the root directory:
   ```env
   # Firebase Configuration
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

   # AI Configuration (Optional)
   VITE_HUGGINGFACE_API_KEY=your_huggingface_api_key
   VITE_HUGGINGFACE_MODEL_ID=mistralai/Mistral-7B-Instruct-v0.2
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

## 📋 Usage Guide

### 1. Authentication
- Users must log in through Firebase authentication
- Email/password authentication is supported
- User data is stored in Firestore

### 2. Creating Medical Reports

#### Template Selection
1. Click the "Maler" (Templates) button in the editor controls
2. Choose from available templates:
   - **Polyp Templates**: For polyp analysis
   - **Colorectal Screening Templates**: For screening samples

#### Macroscopic Description
1. Use the template tree interface to fill in structured data
2. The system automatically generates text based on your selections
3. Edit the generated text in the macroscopic editor

#### Microscopic Description
1. Use the TarmScreening UI for step-by-step analysis
2. Navigate through different panels:
   - General Findings
   - Dysplastic Findings
   - Serrated Features
   - Adenoma Findings
   - Inflammation
   - Invasive Findings

#### AI-Assisted Diagnosis
1. Ensure both macroscopic and microscopic descriptions are complete
2. Click the "Generer" (Generate) button in the diagnosis section
3. Configure AI settings if needed (temperature, model selection)
4. Review and edit the AI-generated diagnosis

### 3. AI Configuration

#### Setting Up AI Providers
1. Click the settings icon next to the "Generer" button
2. Choose from three inference modes:
   - **Remote**: HuggingFace Inference API
   - **Local**: Transformers.js (runs in browser)
   - **Direct**: Direct API calls to various providers

#### Available AI Providers
- **HuggingFace**: Mistral, Llama, Qwen models
- **OpenAI**: GPT models
- **Anthropic**: Claude models
- **DeepSeek**: DeepSeek models
- **Llama**: Meta's Llama models
- **Ollama**: Local Ollama instances
- **Gemini**: Google's Gemini models

### 4. Spell Checking
- Norwegian spell checking is enabled by default
- Right-click on misspelled words to add them to custom dictionary
- Supports both Bokmål and Nynorsk

## 🏗️ Project Structure

```
src/
├── components/           # React components
│   ├── Editor/          # Text editing components
│   ├── TarmScreening/   # Medical analysis interface
│   ├── Trees/           # Template tree interface
│   ├── Settings/        # Configuration dialogs
│   └── TemplateManager/ # Template management
├── services/            # Business logic services
│   ├── providers/       # AI provider implementations
│   ├── AIService.ts     # AI service orchestration
│   └── SpellCheckerService.ts
├── data/               # Static data and templates
│   ├── macro-templates/ # Medical report templates
│   ├── dictionaries/    # Medical terminology
│   └── prompts/        # AI prompts
├── features/           # Redux slices
├── context/           # React contexts
├── utils/             # Utility functions
└── pages/             # Page components
```

## 🔧 Configuration

### AI Model Configuration
The system supports multiple AI inference modes:

1. **Remote Mode**: Uses HuggingFace Inference API
   - Requires API key
   - Supports various models
   - Good for production use

2. **Local Mode**: Uses Transformers.js
   - Runs entirely in browser
   - No API costs
   - Limited model selection
   - Good for privacy-sensitive environments

3. **Direct Mode**: Direct API calls
   - Supports multiple providers
   - More control over API calls
   - Requires provider-specific API keys
   - Gemini is currently the one that works the best

### Spell Checking Configuration
- Norwegian dictionaries are included in `/public/dictionaries/`
- Custom words are stored per user in Firestore
- Supports both Bokmål and Nynorsk

## 🧪 Testing

Run the test suite:
```
npm test
```
no tests are developed currently

## 📚 Documentation

- **Implementation Guide**: See `IMPLEMENTATION_GUIDE.md` for detailed system overview
- **AI Configuration**: See `README-HUGGINGFACE-API.md` for AI setup instructions
- **Template System**: Templates are located in `src/data/macro-templates/`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the documentation files
- Review the implementation guide
- Open an issue on GitHub

## 🔮 Future Enhancements

- Additional medical specialties beyond colorectal pathology
- Enhanced AI model fine-tuning for medical text
- Integration with laboratory information systems (LIS)
- Advanced template customization

---

**email and passord**: tester@gmail.com | test123

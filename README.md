# Azure Document Intelligence UI

A minimal, beautiful web interface to analyze documents using the **Azure AI Document Intelligence API**. Extract text, tables, and key-value pairs from any document with a clean dark-themed UI.

---

## ✦ Features

- 🔑 Enter your Azure Endpoint and API Key directly in the UI
- 📁 Upload documents (PDF, PNG, JPG, TIFF, BMP)
- 📝 Extracts paragraphs and text
- 📊 Detects and displays tables
- 🔍 Extracts key-value pairs with confidence scores
- 📄 Pages summary with word and line count
- 🌙 Beautiful minimal dark theme

---

## 🗂 Project Structure

```
azure-doc-analyzer/
├── index.html    → Main UI layout
├── styles.css    → Dark theme styling
├── script.js     → Azure API logic
└── README.md
```

---

## 🚀 How to Run

### Option 1 — Local Server (Recommended)
```bash
python -m http.server 5500
```
Then open: `http://localhost:5500/index.html`

### Option 2 — VS Code Live Server
- Install the **Live Server** extension in VS Code
- Right click `index.html` → **Open with Live Server**

---

## 🔧 Setup

1. Go to [Azure Portal](https://portal.azure.com)
2. Create a **Document Intelligence** resource
3. Go to **Keys and Endpoint**
4. Copy your **Endpoint URL** and **API Key**
5. Paste them into the UI and upload a document

---

## 🛠 Built With

- HTML, CSS, JavaScript (no frameworks)
- [Azure AI Document Intelligence API](https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/)

---

## 📸 Preview

<img width="1918" height="868" alt="image" src="https://github.com/user-attachments/assets/c0d81473-28de-4c95-9bee-8b2505690344" />


---

## 👨‍💻 Author

**Tharun** — BTech CSE (AI & ML), Chandigarh University  
[GitHub](https://github.com/tharundev-123) • [LinkedIn](https://linkedin.com/in/tharundevmc)

---

## 📄 License

MIT License

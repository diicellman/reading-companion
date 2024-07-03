import 'process/browser';
import { OpenAIEmbeddings } from '@langchain/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { RetrievalQAChain } from 'langchain/chains';
import { OpenAI } from '@langchain/openai';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { BrowserPDFLoader } from './BrowserPDFLoader';

let vectorStore;

// Function to get the API key
function getApiKey() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['openaiApiKey'], (result) => {
      resolve(result.openaiApiKey);
    });
  });
}


document.addEventListener('DOMContentLoaded', function() {
    const extractBtn = document.getElementById('extractBtn');
    const askBtn = document.getElementById('askBtn');
    const pdfStatus = document.getElementById('pdfStatus');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const questionSection = document.getElementById('questionSection');
    const questionInput = document.getElementById('questionInput');
    const answerSection = document.getElementById('answerSection');
    const answerText = document.getElementById('answerText');
    const optionsLink = document.getElementById('optionsLink');

    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {action: "isPDF"}, function(response) {
            if (response && response.isPDF) {
                pdfStatus.textContent = "PDF detected";
                extractBtn.disabled = false;
            } else {
                pdfStatus.textContent = "No PDF detected";
                extractBtn.disabled = true;
            }
        });
    });

    extractBtn.addEventListener('click', async function() {
        try {
            const apiKey = await getApiKey();
            if (!apiKey) {
                throw new Error('API key not set. Please set it in the extension options.');
            }

            extractBtn.disabled = true;
            loadingIndicator.classList.remove('hidden');
            pdfStatus.textContent = "Extracting PDF...";

            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'capturePDF' });

            if (response.success) {
                await processPDF(response.pdfBase64, apiKey);
                pdfStatus.textContent = "PDF processed successfully";
                questionSection.classList.remove('hidden');
            } else {
                throw new Error(response.error);
            }
        } catch (error) {
            pdfStatus.textContent = `Error: ${error.message}`;
        } finally {
            loadingIndicator.classList.add('hidden');
            extractBtn.disabled = false;
        }
    });

    askBtn.addEventListener('click', async function() {
        const question = questionInput.value.trim();
        if (question && vectorStore) {
            try {
                const apiKey = await getApiKey();
                if (!apiKey) {
                    throw new Error('API key not set. Please set it in the extension options.');
                }

                askBtn.disabled = true;
                loadingIndicator.classList.remove('hidden');
                answerText.textContent = "";
                answerSection.classList.remove('hidden');

                await streamAnswer(question, answerText, apiKey);
            } catch (error) {
                answerText.textContent = `Error: ${error.message}`;
            } finally {
                loadingIndicator.classList.add('hidden');
                askBtn.disabled = false;
            }
        }
    });

    optionsLink.addEventListener('click', function() {
        chrome.runtime.openOptionsPage();
    });
});

async function processPDF(pdfBase64, apiKey) {
    const pdfBlob = base64toBlob(pdfBase64, 'application/pdf');
    const loader = new BrowserPDFLoader(pdfBlob);
    const docs = await loader.load();
    const embeddings = new OpenAIEmbeddings({ apiKey: apiKey });
    vectorStore = await MemoryVectorStore.fromDocuments(docs, embeddings);
}

// async function processPDF(pdfBase64, apiKey) {
//     const pdfBlob = base64toBlob(pdfBase64, 'application/pdf');
//     const loader = new PDFLoader(pdfBlob);
//     const docs = await loader.load();
//     const embeddings = new OpenAIEmbeddings({ openAIApiKey: apiKey });
//     vectorStore = await MemoryVectorStore.fromDocuments(docs, embeddings);
// }

async function streamAnswer(question, answerElement, apiKey) {
    const cursor = document.createElement('span');
    cursor.className = 'cursor';
    answerElement.appendChild(cursor);

    const model = new OpenAI({ 
        apiKey: apiKey,
        streaming: true,
        callbacks: [
            {
                handleLLMNewToken(token) {
                    answerElement.insertBefore(document.createTextNode(token), cursor);
                    answerElement.scrollTop = answerElement.scrollHeight;
                },
            },
        ],
    });
    
    const chain = RetrievalQAChain.fromLLM(model, vectorStore.asRetriever());
    await chain.call({ query: question });
    cursor.remove();
}

function base64toBlob(base64, mimeType) {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
}
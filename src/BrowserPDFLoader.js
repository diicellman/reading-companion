import { Document } from 'langchain/document';
import * as pdfjs from 'pdfjs-dist';

export class BrowserPDFLoader {
  constructor(blob) {
    this.blob = blob;
  }

  async load() {
    const typedArray = new Uint8Array(await this.blob.arrayBuffer());
    const pdf = await pdfjs.getDocument(typedArray).promise;
    const numPages = pdf.numPages;
    const documents = [];

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = content.items.map((item) => item.str).join(' ');
      documents.push(new Document({ pageContent: text, metadata: { page: i } }));
    }

    return documents;
  }
}
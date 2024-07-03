function isPDF() {
    return document.contentType === 'application/pdf';
}

async function captureOpenedPDF() {
    if (!isPDF()) {
        return { success: false, error: 'Not a PDF page' };
    }

    try {
        const pdfUrl = window.location.href;
        const response = await fetch(pdfUrl);
        const pdfArrayBuffer = await response.arrayBuffer();
        const pdfBase64 = btoa(
            new Uint8Array(pdfArrayBuffer)
                .reduce((data, byte) => data + String.fromCharCode(byte), '')
        );

        return { success: true, pdfBase64: pdfBase64 };
    } catch (error) {
        console.error('Error capturing PDF:', error);
        return { success: false, error: error.message };
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'isPDF') {
        sendResponse({ isPDF: isPDF() });
    } else if (request.action === 'capturePDF') {
        captureOpenedPDF().then(sendResponse);
    }
    return true; // Will respond asynchronously
});
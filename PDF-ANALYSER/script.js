let pdfDoc = null;
let isProcessing = false;

// Toast notification function
function showToast(message, type = 'info', duration = 3000) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

function addMessage(content, type = "assistant") {
  const messagesContainer = document.getElementById("messages");
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${type}`;
  messageDiv.innerHTML = content;
  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Auto-process PDF when file is selected
async function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  const uploadStatus = document.getElementById('uploadStatus');
  uploadStatus.className = 'upload-status loading';
  uploadStatus.textContent = '📄 Processing PDF...';
  uploadStatus.style.display = 'block';

  try {
    const arrayBuffer = await file.arrayBuffer();
    pdfDoc = await pdfjsLib.getDocument(arrayBuffer).promise;

    // Hide setup form and show chat form
    document.getElementById("setupForm").style.display = "none";
    document.getElementById("chatForm").style.display = "block";
    
    // Update file info
    document.getElementById("fileInfo").textContent = `📄 ${file.name} (${pdfDoc.numPages} pages)`;
    
    // Show success status
    uploadStatus.className = 'upload-status success';
    uploadStatus.textContent = `✅ PDF loaded successfully! ${pdfDoc.numPages} pages detected.`;
    
    // Show success message and toast
    addMessage(
      `Great! I've loaded your PDF "${file.name}" with ${pdfDoc.numPages} pages. Now you can search for fund information.`,
      "success"
    );
    showToast(`PDF "${file.name}" loaded successfully!`, 'success');
    
    // Focus on search input
    document.getElementById("fundName").focus();
    
  } catch (error) {
    uploadStatus.className = 'upload-status error';
    uploadStatus.textContent = `❌ Error loading PDF: ${error.message}`;
    
    addMessage(`Error loading PDF: ${error.message}`, "error");
    showToast(`Failed to load PDF: ${error.message}`, 'error');
    
    // Reset file input
    event.target.value = '';
  }
}

async function searchFund() {
  const fundNameInput = document.getElementById("fundName");
  const fundName = fundNameInput.value.trim();
  const messagesContainer = document.getElementById("messages");

  if (!fundName) {
    addMessage("Please enter a fund name to search.", "error");
    showToast("Please enter a fund name to search.", "error");
    return;
  }
  
  if (!pdfDoc) {
    addMessage("Please upload a PDF first.", "error");
    showToast("Please upload a PDF first.", "error");
    return;
  }
  
  if (isProcessing) {
    addMessage("Please wait for the current search to complete.", "error");
    showToast("Please wait for the current search to complete.", "error");
    return;
  }

  isProcessing = true;
  const searchBtn = document.getElementById("searchBtn");
  searchBtn.innerHTML = '<span class="loading"></span> Searching...';
  searchBtn.disabled = true;

  addMessage(`Searching for "${fundName}" in the PDF...`, "user");
  showToast(`Searching for "${fundName}"...`, "info");

  try {
    let foundPages = [];
    let bestMatch = null;
    let bestScore = 0;

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      if (!textContent || !textContent.items || textContent.items.length === 0) {
        continue;
      }
      
      const extractedText = extractStructuredText(textContent);
      if (!extractedText || extractedText.trim().length < 10) {
        continue;
      }

      const searchScore = calculateSearchScore(extractedText, fundName);
      if (searchScore > 0) {
        foundPages.push({
          page: pageNum,
          text: extractedText,
          score: searchScore,
        });
        if (searchScore > bestScore) {
          bestScore = searchScore;
          bestMatch = {
            page: pageNum,
            text: extractedText,
            score: searchScore,
          };
        }
      }
    }

    if (!bestMatch) {
      let errorMsg = `Fund "${fundName}" was not found in the PDF.\n\n`;
      errorMsg += `Suggestions:\n`;
      errorMsg += `• Try searching for just part of the fund name\n`;
      errorMsg += `• Check the spelling\n`;
      errorMsg += `• Use the Debug button to see available text\n`;
      errorMsg += `• Try searching for keywords like "equity", "debt", "fund" etc.`;
      
      addMessage(errorMsg.replace(/\n/g, "<br>"), "error");
      showToast(`Fund "${fundName}" not found`, "error");
      return;
    }

    addMessage(
      `Found matches on ${foundPages.length} page(s). Best match on page ${bestMatch.page} (score: ${bestMatch.score}).`,
      "assistant"
    );

    // Store text globally for potential use by copyText if AI fails
    window[`pageText_${bestMatch.page}`] = bestMatch.text;

    addMessage(
      `🤖 Attempting to automatically analyze content from page ${bestMatch.page} with AI...`,
      "assistant"
    );
    
    searchBtn.innerHTML = '<span class="loading"></span> AI Processing...';
    showToast("Analyzing with AI...", "info");

    const fundNameToAnalyze = fundNameInput.value.trim() || "the fund";

    try {
      const aiResponse = await callOpenAI(bestMatch.text, fundNameToAnalyze);
      const aiResponseCleanedForDisplay = aiResponse
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      
      window[`aiResultText_page_${bestMatch.page}`] = aiResponse; // Store raw AI response for copying

      const resultDiv = document.createElement("div");
      resultDiv.innerHTML = `
        <strong>🤖 AI Analysis Results (from Page ${bestMatch.page}):</strong>
        <div class="result-section">${aiResponseCleanedForDisplay}</div> 
        <div style="margin-top: 10px;">
          <button onclick="copyAnalyzedText('page_${bestMatch.page}')" class="btn" style="background: #17a2b8; color: white; padding: 10px 20px;">📋 Copy AI Result</button>
        </div>`;
      
      messagesContainer.appendChild(resultDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      
      showToast("Analysis completed successfully!", "success");
      
    } catch (aiError) {
      const errorDiv = document.createElement("div");
      const sanitizedErrorMessage = aiError.message
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      const sanitizedBestMatchText = bestMatch.text
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      errorDiv.innerHTML = `
        <div class="message error">
          <strong>❌ AI Processing Failed for page ${bestMatch.page}:</strong><br>
          ${sanitizedErrorMessage}<br><br>
          <strong>Suggestions:</strong><br>
          • The AI could not process the text from page ${bestMatch.page}. You can try copying the original text from this page and processing it manually.<br>
          <button onclick="copyText('${bestMatch.page}')" class="btn" style="background: #28a745; color: white; padding: 10px 20px; margin-top:10px;">
            📋 Copy Original Page ${bestMatch.page} Text + Prompt
          </button><br>
          • Check your browser's console (F12) for technical details.<br>
          • Ensure your OpenAI API key is correct and active.
        </div>
        <div class="result-section" style="background: #fff0f0; max-height: 150px; margin-top:10px; font-size:0.8em;">
          <strong>Original Text from Page ${bestMatch.page} (for reference):</strong><br>${sanitizedBestMatchText}
        </div>`;
      
      messagesContainer.appendChild(errorDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      
      showToast("AI analysis failed", "error");
    }
    
  } catch (error) {
    addMessage(`Search error: ${error.message}`, "error");
    showToast(`Search error: ${error.message}`, "error");
    console.error("Full search error:", error);
  } finally {
    isProcessing = false;
    searchBtn.innerHTML = "Search";
    searchBtn.disabled = false;
  }
}

function calculateSearchScore(text, fundName) {
  const normalizedText = text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ");
  const normalizedFund = fundName
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ");
  let score = 0;
  if (normalizedText.includes(normalizedFund)) score += 100;

  const fundWords = normalizedFund
    .split(" ")
    .filter((word) => word.length > 2);
  let wordMatches = 0;
  fundWords.forEach((word) => {
    if (normalizedText.includes(word)) {
      wordMatches++;
      score += 10;
    }
  });
  if (fundWords.length > 0) {
    const matchPercentage = wordMatches / fundWords.length;
    if (matchPercentage >= 0.7) score += 20;
  }
  if (fundName.length > 4) {
    const substrings = [
      fundName.substring(0, Math.floor(fundName.length * 0.7)),
      fundName.substring(Math.floor(fundName.length * 0.3)),
    ];
    substrings.forEach((substring) => {
      if (
        substring.length > 3 &&
        normalizedText.includes(substring.toLowerCase())
      ) {
        score += 5;
      }
    });
  }
  return score;
}

function extractStructuredText(textContent) {
  if (!textContent || !textContent.items || textContent.items.length === 0) {
    return "No text content found on this page.";
  }
  try {
    const methods = [extractByPosition, extractByOrder, extractSimple];
    for (let method of methods) {
      const result = method(textContent);
      if (result && result.trim().length > 50) return result;
    }
    return "Could not extract meaningful text from this page.";
  } catch (error) {
    console.error("Text extraction error:", error);
    return `Text extraction failed: ${error.message}`;
  }
}

function extractByPosition(textContent) {
  const items = textContent.items.filter((item) => item.str && item.str.trim());
  if (items.length === 0) return "";
  const lines = {};
  const tolerance = 3;
  items.forEach((item) => {
    const y = Math.round(item.transform[5]);
    const x = Math.round(item.transform[4]);
    let lineY = null;
    for (let existingY in lines) {
      if (Math.abs(existingY - y) <= tolerance) {
        lineY = existingY;
        break;
      }
    }
    if (lineY === null) {
      lineY = y;
      lines[lineY] = [];
    }
    lines[lineY].push({
      text: item.str,
      x: x,
      fontSize: item.height || 12,
    });
  });
  const sortedLines = Object.keys(lines)
    .map((y) => parseInt(y))
    .sort((a, b) => b - a);
  let result = "";
  sortedLines.forEach((y) => {
    const lineItems = lines[y].sort((a, b) => a.x - b.x);
    const lineText = lineItems
      .map((item) => item.text)
      .join(" ")
      .trim();
    if (lineText) result += lineText + "\n";
  });
  return result;
}

function extractByOrder(textContent) {
  return textContent.items
    .filter((item) => item.str && item.str.trim())
    .map((item) => item.str.trim())
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractSimple(textContent) {
  const allText = textContent.items
    .map((item) => item.str || "")
    .join("")
    .trim();
  return allText
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/(\d)([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

async function callOpenAI(textChunk, fundName) {
  try {
    const response = await fetch("http://localhost:3000/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        textChunk: textChunk,
        fundName: fundName,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Server error');
    }

    const data = await response.json();
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content;
    } else {
      throw new Error("Invalid response structure from server.");
    }
  } catch (error) {
    throw new Error(`Failed to get analysis: ${error.message}`);
  }
}

async function debugPDF() {
  if (!pdfDoc) {
    addMessage("Please upload a PDF first.", "error");
    showToast("Please upload a PDF first.", "error");
    return;
  }
  
  addMessage("Extracting and analyzing PDF content for debug...", "user");
  showToast("Analyzing PDF content...", "info");
  
  try {
    let debugInfo = `PDF Analysis:\n- Total Pages: ${pdfDoc.numPages}\n\n`;
    const maxPages = Math.min(5, pdfDoc.numPages);
    
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      debugInfo += `=== PAGE ${pageNum} ===\n`;
      debugInfo += `Text Items Found: ${textContent.items.length}\n`;
      
      if (textContent.items.length === 0) {
        debugInfo += "No text items found on this page.\n\n";
        continue;
      }
      
      const extractedText = extractStructuredText(textContent);
      debugInfo += `Extracted Text Length: ${extractedText.length} characters\n`;
      debugInfo += `First 500 chars:\n${extractedText.substring(0, 500)}...\n\n`;
      debugInfo += `Raw text items (first 10):\n`;
      
      textContent.items.slice(0, 10).forEach((item, idx) => {
        debugInfo += `${idx + 1}. "${item.str}" (x:${Math.round(item.transform[4])}, y:${Math.round(item.transform[5])})\n`;
      });
      debugInfo += "\n";
    }
    
    if (pdfDoc.numPages > maxPages) {
      debugInfo += `... and ${pdfDoc.numPages - maxPages} more pages not shown in this debug output.`;
    }
    
    const sanitizedDebugInfo = debugInfo
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
      
    const resultDiv = document.createElement("div");
    resultDiv.innerHTML = `
      <strong>🔍 PDF Debug Analysis:</strong>
      <div class="result-section" style="max-height: 400px; font-size: 0.75rem; white-space: pre-wrap;">${sanitizedDebugInfo}</div>`;
    
    document.getElementById("messages").appendChild(resultDiv);
    document.getElementById("messages").scrollTop = document.getElementById("messages").scrollHeight;
    
    showToast("Debug analysis completed", "success");
    
  } catch (error) {
    addMessage(`Debug error: ${error.message}`, "error");
    showToast(`Debug error: ${error.message}`, "error");
    console.error("Full debug error:", error);
  }
}

function copyText(pageNum) {
  const text = window[`pageText_${pageNum}`];
  if (!text) {
    addMessage("Error: No text to copy for page " + pageNum, "error");
    showToast("Error: No text to copy", "error");
    return;
  }
  
  const fundName = document.getElementById("fundName").value.trim() || "the specified fund";
  const promptToCopy = `Please analyze this financial document text related to '${fundName}' and extract:\n\n1. Top Holdings (with percentages)\n2. Top Sectors (with percentages)\n3. Asset Allocation (e.g., Large Cap, Mid Cap, Small Cap, Cash & Equivalent, Others, with percentages)\n\nFormat the results clearly. If any data is not available, please state "Not Found".\n\n--- TEXT TO ANALYZE ---\n${text}\n--- END OF TEXT ---`;

  navigator.clipboard
    .writeText(promptToCopy)
    .then(() => {
      addMessage("✅ Original page text and analysis prompt copied to clipboard!", "success");
      showToast("Text and prompt copied to clipboard!", "success");
    })
    .catch(() => {
      const textArea = document.createElement("textarea");
      textArea.value = promptToCopy;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        addMessage("✅ Original page text and prompt copied! (Fallback)", "success");
        showToast("Text and prompt copied! (Fallback)", "success");
      } catch (err) {
        addMessage("Error: Could not copy text. Please copy manually.", "error");
        showToast("Error: Could not copy text", "error");
      }
      document.body.removeChild(textArea);
    });
}

function copyAnalyzedText(resultKey) {
  const textToCopy = window[`aiResultText_${resultKey}`];
  if (!textToCopy) {
    addMessage("Error: No AI result to copy.", "error");
    showToast("Error: No AI result to copy", "error");
    return;
  }
  
  navigator.clipboard
    .writeText(textToCopy)
    .then(() => {
      addMessage("✅ AI analysis result copied to clipboard!", "success");
      showToast("AI analysis copied to clipboard!", "success");
    })
    .catch((err) => {
      console.error("Failed to copy AI result: ", err);
      const textArea = document.createElement("textarea");
      textArea.value = textToCopy;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        addMessage("✅ AI analysis result copied to clipboard! (Fallback method)", "success");
        showToast("AI analysis copied! (Fallback)", "success");
      } catch (errFallback) {
        addMessage("Error: Could not copy AI result using fallback.", "error");
        showToast("Error: Could not copy AI result", "error");
      }
      document.body.removeChild(textArea);
    });
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
  // Add file input listener
  document.getElementById('pdfFile').addEventListener('change', handleFileSelect);
  
  // Add enter key listener for search
  document.getElementById("fundName").addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      searchFund();
    }
  });
});
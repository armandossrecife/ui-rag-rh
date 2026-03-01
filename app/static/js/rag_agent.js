// app/static/js/rag_agent.js
/**
 * JavaScript para o Agente de RH com RAG
 */

let streamMode = true;
let sourcesCount = 0;

/**
 * Formata blocos de código no texto
 */
function formatCodeBlocks(text) {
    if (!text) return "";
    return text.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        const language = (lang || "text").toUpperCase();
        const escaped = code.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        return `<div class="code-block"><small><i class="fas fa-code"></i> ${language}</small><pre>${escaped.trim()}</pre></div>`;
    });
}

/**
 * Formata listas no texto
 */
function formatLists(text) {
    if (!text) return "";
    // Listas não ordenadas
    text = text.replace(/^\s*[-*]\s+(.+)$/gm, '<li>$1</li>');
    text = text.replace(/(<li>.*<\/li>\n?)+/g, '<ul class="mt-2 mb-2">$&</ul>');
    // Listas ordenadas
    text = text.replace(/^\s*\d+\.\s+(.+)$/gm, '<li>$1</li>');
    return text;
}

/**
 * Atualiza contador de fontes
 */
function updateSourcesCounter(count) {
    sourcesCount = count;
    document.getElementById("sources-counter").textContent = `Fontes: ${count}`;
}

/**
 * Adiciona mensagem ao chat
 */
function addMessage(content, isUser = false) {
    const chatBody = document.getElementById("chat-body");
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${isUser ? "user-message" : "bot-message"}`;
    
    const now = new Date();
    const timeStr = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    
    messageDiv.innerHTML = `
        <div class="message-content">${formatCodeBlocks(formatLists(content))}</div>
        <span class="message-time">${isUser ? "Você" : "Agente RH"} • ${timeStr}</span>
    `;
    
    const typingIndicator = document.getElementById("typing-indicator");
    chatBody.insertBefore(messageDiv, typingIndicator);
    chatBody.scrollTop = chatBody.scrollHeight;
}

/**
 * Adiciona painel de fontes
 */
function showSourcesPanel(fontes) {
    const panel = document.getElementById("sources-panel");
    const content = document.getElementById("sources-content");
    
    if (!fontes || fontes.length === 0) {
        panel.style.display = "none";
        updateSourcesCounter(0);
        return;
    }
    
    panel.style.display = "block";
    updateSourcesCounter(fontes.length);
    
    let html = '<div class="row g-3">';
    fontes.forEach((fonte, index) => {
        const docName = fonte.metadata?.documento?.split('/').pop() || 'Documento';
        const categoria = fonte.metadata?.categoria || 'geral';
        const pagina = fonte.metadata?.pagina || '?';
        
        // Badge de categoria
        const catBadges = {
            'ferias': 'bg-info',
            'home_office': 'bg-success',
            'conduta': 'bg-warning',
            'geral': 'bg-secondary'
        };
        
        html += `
            <div class="col-md-6">
                <div class="card border-0 h-100" style="background: var(--bg-light);">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h6 class="fw-bold mb-0">
                                <i class="bi bi-file-earmark-text me-1"></i>${docName}
                            </h6>
                            <span class="badge ${catBadges[categoria] || 'bg-secondary'}">
                                ${categoria}
                            </span>
                        </div>
                        <small class="text-muted d-block mb-2">
                            <i class="bi bi-file-earmark"></i> Página ${pagina}
                        </small>
                        <p class="small text-muted mb-0" style="max-height: 100px; overflow-y: auto;">
                            ${fonte.content.substring(0, 200)}...
                        </p>
                    </div>
                </div>
            </div>
        `;
    });
    html += '</div>';
    
    content.innerHTML = html;
}

/**
 * Define modo de streaming
 */
function setStreamMode(enable) {
    streamMode = enable;
    document.getElementById("btn-stream-on").classList.toggle("active", enable);
    document.getElementById("btn-stream-off").classList.toggle("active", !enable);
}

/**
 * Reseta botão de envio
 */
function resetSendButton() {
    document.getElementById("typing-indicator").style.display = "none";
    const sendBtn = document.getElementById("send-btn");
    sendBtn.disabled = false;
    sendBtn.innerHTML = '<i class="bi bi-send-fill"></i>';
}

/**
 * Verifica status da API
 */
async function checkApiStatus() {
    try {
        const r = await fetch("/health");
        const data = await r.json();
        const badge = document.getElementById("api-status");
        
        if (data.status === "healthy") {
            badge.className = "status-badge status-online";
            badge.innerHTML = '<i class="fas fa-circle"></i> Online';
        } else {
            badge.className = "status-badge status-offline";
            badge.innerHTML = '<i class="fas fa-circle"></i> Offline';
        }
    } catch {
        const badge = document.getElementById("api-status");
        badge.className = "status-badge status-offline";
        badge.innerHTML = '<i class="fas fa-circle"></i> Offline';
    }
}

/**
 * Verifica status da indexação RAG
 */
async function checkRagStatus() {
    try {
        const r = await fetch("/api/rag/status");
        const data = await r.json();
        const badge = document.getElementById("rag-status-badge");
        const text = document.getElementById("rag-status-text");
        
        if (data.total_documents > 0) {
            badge.className = "status-badge status-online";
            badge.innerHTML = `<i class="fas fa-check-circle"></i> ${data.total_documents} docs`;
            text.textContent = `Base indexada com ${data.total_documents} documentos`;
        } else {
            badge.className = "status-badge status-offline";
            badge.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Não indexado';
            text.textContent = 'Nenhum documento indexado. Contate o administrador.';
        }
    } catch (e) {
        const badge = document.getElementById("rag-status-badge");
        badge.className = "status-badge status-offline";
        badge.innerHTML = '<i class="fas fa-times-circle"></i> Erro';
        document.getElementById("rag-status-text").textContent = 'Erro ao verificar status';
    }
}

/**
 * Envia mensagem para o Agente RH
 */
async function sendMessage() {
    const input = document.getElementById("prompt-input");
    const prompt = input.value.trim();
    const categoria = document.getElementById("category-select").value;
    const topK = parseInt(document.getElementById("topk-select").value);
    
    if (!prompt) return;
    
    // Adiciona mensagem do usuário
    addMessage(prompt, true);
    input.value = "";
    
    // UI Loading
    document.getElementById("typing-indicator").style.display = "block";
    const sendBtn = document.getElementById("send-btn");
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    
    // Esconde painel de fontes anterior
    document.getElementById("sources-panel").style.display = "none";
    
    // Decide qual método usar
    if (streamMode) {
        await streamRAGResponse(prompt, categoria, topK);
    } else {
        await generateRAGResponse(prompt, categoria, topK);
    }
}

/**
 * Gera resposta RAG sem streaming
 */
async function generateRAGResponse(prompt, categoria, topK) {
    const chatBody = document.getElementById("chat-body");
    const typingIndicator = document.getElementById("typing-indicator");
    
    const botMessageDiv = document.createElement("div");
    botMessageDiv.className = "message bot-message";
    const timeStr = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    
    botMessageDiv.innerHTML = `
        <div class="message-content" id="response-content">
            <span class="text-muted"><i class="fas fa-circle-notch fa-spin"></i> Consultando base de conhecimento...</span>
        </div>
        <span class="message-time">Agente RH • ${timeStr}</span>
    `;
    
    chatBody.insertBefore(botMessageDiv, typingIndicator);
    chatBody.scrollTop = chatBody.scrollHeight;
    
    const contentEl = botMessageDiv.querySelector("#response-content");
    let fullResponse = "";
    
    try {
        const r = await fetch("/api/rag/query", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                pergunta: prompt,
                categoria: categoria || null,
                top_k: topK,
                rerank_top: 4
            })
        });
        
        const data = await r.json();
        
        if (!r.ok) {
            throw new Error(data.detail || "Erro desconhecido no servidor.");
        }
        
        fullResponse = data.resposta;
        contentEl.innerHTML = formatCodeBlocks(formatLists(fullResponse));
        
        // Mostra fontes
        if (data.fontes && data.fontes.length > 0) {
            showSourcesPanel(data.fontes);
        }
        
        chatBody.scrollTop = chatBody.scrollHeight;
        
    } catch (e) {
        contentEl.innerHTML = `<span class="text-danger"><i class="fas fa-exclamation-triangle"></i> Erro: ${e.message}</span>`;
    } finally {
        resetSendButton();
    }
}

/**
 * Gera resposta RAG com streaming
 */
async function streamRAGResponse(prompt, categoria, topK) {
    const chatBody = document.getElementById("chat-body");
    const typingIndicator = document.getElementById("typing-indicator");
    
    const botMessageDiv = document.createElement("div");
    botMessageDiv.className = "message bot-message";
    const timeStr = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    
    botMessageDiv.innerHTML = `
        <div class="message-content" id="streaming-content"></div>
        <span class="message-time">Agente RH • ${timeStr}</span>
    `;
    
    chatBody.insertBefore(botMessageDiv, typingIndicator);
    const contentEl = botMessageDiv.querySelector("#streaming-content");
    
    let fullResponse = "";
    let buffer = "";
    let sourcesData = null;
    
    try {
        const r = await fetch("/api/rag/query/stream", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "text/event-stream"
            },
            body: JSON.stringify({
                pergunta: prompt,
                categoria: categoria || null,
                top_k: topK,
                rerank_top: 4
            })
        });
        
        if (!r.ok || !r.body) {
            throw new Error(`HTTP ${r.status}`);
        }
        
        const reader = r.body.getReader();
        const decoder = new TextDecoder("utf-8");
        
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            let idx;
            
            while ((idx = buffer.indexOf("\n")) !== -1) {
                const rawEvent = buffer.slice(0, idx);
                buffer = buffer.slice(idx + 1);
                
                const lines = rawEvent.split("\n");
                for (const line of lines) {
                    if (!line.startsWith("data: ")) continue;
                    
                    const jsonStr = line.slice(6).trim();
                    if (!jsonStr) continue;
                    
                    let evt;
                    try {
                        evt = JSON.parse(jsonStr);
                    } catch {
                        continue;
                    }
                    
                    if (evt.type === "token") {
                        fullResponse += evt.content || "";
                        contentEl.innerHTML = formatCodeBlocks(formatLists(fullResponse));
                        chatBody.scrollTop = chatBody.scrollHeight;
                    } else if (evt.type === "sources") {
                        sourcesData = evt.data;
                    } else if (evt.type === "error") {
                        contentEl.innerHTML = `<span class="text-danger"><i class="fas fa-exclamation-triangle"></i> Erro: ${evt.error}</span>`;
                    } else if (evt.type === "done") {
                        // Finalizado
                        if (sourcesData) {
                            showSourcesPanel(sourcesData);
                        }
                    }
                }
            }
        }
        
    } catch (e) {
        contentEl.innerHTML = `<span class="text-danger"><i class="fas fa-exclamation-triangle"></i> Erro: ${e.message}</span>`;
    } finally {
        resetSendButton();
    }
}

/**
 * Limpa o chat
 */
function clearChat() {
    const chatBody = document.getElementById("chat-body");
    const typingIndicator = document.getElementById("typing-indicator");
    
    chatBody.innerHTML = `
        <div class="message bot-message">
            <div class="message-content">
                Olá! Sou o Agente de RH da empresa. Posso ajudar com dúvidas sobre:
                <ul class="mt-2 mb-0">
                    <li>🏖️ Políticas de férias</li>
                    <li>🏠 Home office e trabalho remoto</li>
                    <li>📋 Código de conduta e ética</li>
                </ul>
                <p class="mt-2 mb-0">Faça sua pergunta abaixo!</p>
            </div>
            <span class="message-time">Sistema</span>
        </div>
    `;
    chatBody.appendChild(typingIndicator);
    
    document.getElementById("sources-panel").style.display = "none";
    updateSourcesCounter(0);
    resetSendButton();
}

/**
 * Inicialização
 */
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("send-btn").addEventListener("click", sendMessage);
    document.getElementById("btn-stream-on").addEventListener("click", () => setStreamMode(true));
    document.getElementById("btn-stream-off").addEventListener("click", () => setStreamMode(false));
    
    document.getElementById("prompt-input").addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });
    
    // Check status
    checkApiStatus();
    checkRagStatus();
    setInterval(checkApiStatus, 30000);
    setInterval(checkRagStatus, 60000);
    
    document.getElementById("prompt-input").focus();
});
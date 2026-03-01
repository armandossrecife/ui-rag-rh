# 📋 Relatório Técnico: Frontend Flask com Feature Agente de RH (RAG)

## 1. Visão Geral do Projeto

### 1.1 Objetivo

Desenvolver uma **interface web frontend** em Flask que consuma a API REST do **Agente de RH com RAG**, permitindo que usuários autenticados façam consultas sobre políticas internas da organização (férias, home office, código de conduta) através de uma interface de chat inteligente.

### 1.2 Escopo

| Funcionalidade | Status | Descrição |
|---------------|--------|-----------|
| **Autenticação** | ✅ Mantido | Registro, login, logout com JWT |
| **Dashboard** | ✅ Atualizado | Link para Agente RH + estatísticas |
| **Chat Normal** | ✅ Mantido | Conversas com LLM genérico |
| **Histórico de Chat** | ✅ Mantido | Visualização de conversas anteriores |
| **Agente RH (RAG)** | ✅ **NOVO** | Consultas específicas sobre políticas de RH |
| **Streaming** | ✅ Suportado | Respostas em tempo real (SSE) |
| **Filtro por Categoria** | ✅ Incluído | Férias, Home Office, Conduta, Geral |
| **Painel de Fontes** | ✅ Incluído | Exibe documentos utilizados na resposta |

---

## 2. Arquitetura do Sistema

### 2.1 Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ARQUITETURA FRONTEND + BACKEND                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐     ┌──────────────────┐     ┌──────────────────────┐   │
│  │   Usuário    │────▶│   Flask Frontend │────▶│   FastAPI Backend    │   │
│  │  (Browser)   │◀────│   (Port 5001)    │◀────│   (Port 8000)        │   │
│  └──────────────┘     └────────┬─────────┘     └──────────┬───────────┘   │
│                                │                          │               │
│                   ┌────────────┴────────────┐            │               │
│                   ▼                         ▼            ▼               │
│          ┌─────────────────┐   ┌─────────────────┐  ┌───────────┐       │
│          │   Session Flask │   │   Templates     │  │  Ollama   │       │
│          │   (JWT Token)   │   │   (HTML/CSS/JS) │  │  (LLM)    │       │
│          └─────────────────┘   └─────────────────┘  └───────────┘       │
│                                                        │                 │
│                                           ┌────────────┴────────────┐  │
│                                           ▼                         ▼  │
│                                  ┌─────────────────┐   ┌─────────────────┐│
│                                  │   ChromaDB      │   │   SQLite DB     ││
│                                  │   (Embeddings)  │   │   (Users/Chats) ││
│                                  └─────────────────┘   └─────────────────┘│
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Fluxo de Dados - Consulta RAG

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      FLUXO DE CONSULTA AGENTE RH                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Usuário digita pergunta no frontend Flask                              │
│         │                                                                   │
│         ▼                                                                   │
│  2. JavaScript captura input e envia para /api/rag/query                   │
│         │                                                                   │
│         ▼                                                                   │
│  3. Flask proxy adiciona token JWT e encaminha para Backend                │
│         │                                                                   │
│         ▼                                                                   │
│  4. FastAPI valida token e chama RAGService.query()                        │
│         │                                                                   │
│         ├──▶ 4.1 Gera embedding da pergunta (Ollama)                       │
│         ├──▶ 4.2 Busca documentos similares (ChromaDB)                     │
│         ├──▶ 4.3 Reranking semântico (LLM)                                 │
│         └──▶ 4.4 Gera resposta com contexto (LLM)                          │
│                                                                             │
│  5. Backend retorna resposta + fontes                                      │
│         │                                                                   │
│         ▼                                                                   │
│  6. Flask retorna JSON para frontend                                       │
│         │                                                                   │
│         ▼                                                                   │
│  7. JavaScript renderiza resposta + painel de fontes                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Estrutura de Diretórios

```
rag-rh-frontend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # Aplicação Flask principal
│   ├── templates/
│   │   ├── base.html           # Template base (layout comum)
│   │   ├── login.html          # Página de login
│   │   ├── register.html       # Página de registro
│   │   ├── dashboard.html      # Dashboard do usuário
│   │   ├── chat.html           # Página de chat normal
│   │   ├── chat_history.html   # Histórico de chat
│   │   └── rag_agent.html      # NOVO: Página do Agente RH
│   └── static/
│       ├── js/
│       │   ├── chat.js         # Lógica do chat normal
│       │   └── rag_agent.js    # NOVO: Lógica do Agente RH
│       └── css/
│           └── styles.css      # Estilos personalizados
├── .env                        # Variáveis de ambiente
├── requirements.txt            # Dependências Python
└── README.md                   # Documentação
```

---

## 4. Componentes Principais

### 4.1 Aplicação Flask (`app/main.py`)

**Responsabilidade:** Gerenciar rotas, sessões e proxy para API backend.

#### Rotas Existentes (Mantidas)

| Rota | Método | Descrição | Auth |
|------|--------|-----------|------|
| `/` | GET | Redireciona para login/dashboard | ❌ |
| `/register` | GET/POST | Registro de usuário | ❌ |
| `/login` | GET/POST | Login de usuário | ❌ |
| `/logout` | GET | Logout de usuário | ✅ |
| `/dashboard` | GET | Dashboard principal | ✅ |
| `/chats/new` | POST | Criar novo chat | ✅ |
| `/chat/<int:chat_id>` | GET | Página de chat | ✅ |
| `/chat/<int:chat_id>/history` | GET | Histórico do chat | ✅ |
| `/api/generate` | POST | Inferência sem stream | ✅ |
| `/api/stream` | POST | Inferência com stream | ✅ |
| `/health` | GET | Health check | ❌ |
| `/api/models-count` | GET | Contagem de modelos | ✅ |

#### Novas Rotas (Agente RH)

| Rota | Método | Descrição | Auth |
|------|--------|-----------|------|
| `/rag-agent` | GET | Página do Agente RH | ✅ |
| `/api/rag/query` | POST | Consulta RAG sem stream | ✅ |
| `/api/rag/query/stream` | POST | Consulta RAG com stream | ✅ |
| `/api/rag/status` | GET | Status da indexação RAG | ✅ |

#### Código das Novas Rotas

```python
# -------- RAG AGENT PAGE --------
@app.get("/rag-agent")
def rag_agent_page():
    """Página do Agente de RH com RAG."""
    red = require_login()
    if red:
        return red
    
    return render_template(
        "rag_agent.html",
        email=get_user_email()
    )

# -------- API: RAG QUERY (NO STREAM) --------
@app.post("/api/rag/query")
def api_rag_query():
    """Proxy para consulta RAG sem streaming."""
    red = require_login()
    if red:
        return jsonify({"detail": "Unauthorized"}), 401
    
    data = request.get_json(force=True) or {}
    
    payload = {
        "pergunta": data.get("pergunta", ""),
        "top_k": data.get("top_k", 8),
        "rerank_top": data.get("rerank_top", 4),
        "categoria": data.get("categoria")  # ferias, home_office, conduta, geral
    }
    
    try:
        r = requests.post(
            f"{BACKEND_URL}/rag/query",
            json=payload,
            headers=auth_headers(),
            timeout=120  # RAG pode demorar mais
        )
        
        if r.status_code == 200:
            return jsonify(r.json())
        else:
            try:
                err_det = r.json()
            except:
                err_det = {"detail": r.text}
            return jsonify(err_det), r.status_code
            
    except requests.exceptions.Timeout:
        return jsonify({"detail": "Timeout na consulta RAG. Tente novamente."}), 504
    except Exception as e:
        return jsonify({"detail": str(e)}), 500

# -------- API: RAG STREAM (SSE) --------
@app.post("/api/rag/query/stream")
def api_rag_query_stream():
    """Proxy para consulta RAG com streaming."""
    red = require_login()
    if red:
        return ("Unauthorized", 401)
    
    data = request.get_json(force=True) or {}
    
    payload = {
        "pergunta": data.get("pergunta", ""),
        "top_k": data.get("top_k", 8),
        "rerank_top": data.get("rerank_top", 4),
        "categoria": data.get("categoria")
    }
    
    def generate():
        with requests.post(
            f"{BACKEND_URL}/rag/query/stream",
            json=payload,
            stream=True,
            headers={**auth_headers(), "Accept": "text/event-stream"},
            timeout=300,
        ) as r:
            if r.status_code != 200:
                error_msg = json.dumps({
                    'type': 'error',
                    'error': f'Backend error {r.status_code}'
                })
                yield f"data: {error_msg}\n\n"
                return
            
            for line in r.iter_lines():
                if line:
                    try:
                        decoded_line = line.decode('utf-8')
                        yield decoded_line + "\n"
                    except Exception:
                        continue
    
    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        },
    )

# -------- API: RAG INDEX STATUS --------
@app.get("/api/rag/status")
def api_rag_status():
    """Verifica status da indexação RAG."""
    red = require_login()
    if red:
        return jsonify({"detail": "Unauthorized"}), 401
    
    try:
        r = requests.get(
            f"{BACKEND_URL}/rag/stats",
            headers=auth_headers(),
            timeout=30
        )
        
        if r.status_code == 200:
            return jsonify(r.json())
        else:
            return jsonify({"indexed": False, "error": "Não indexado"}), 200
            
    except Exception as e:
        return jsonify({"indexed": False, "error": str(e)}), 200
```

---

### 4.2 Template do Agente RH (`app/templates/rag_agent.html`)

**Responsabilidade:** Interface visual para consultas ao Agente de RH.

#### Estrutura HTML

| Seção | Componente | Descrição |
|-------|-----------|-----------|
| **Sidebar** | Navegação | Links para Dashboard, Agente RH, Novo Chat, Logout |
| **Header** | Título + Status | Nome da feature + status da API |
| **Status Card** | Indexação | Mostra se documentos estão indexados |
| **Chat Container** | Área de conversa | Mensagens do usuário e agente |
| **Input Area** | Controles | Categoria, Top K, Modo (Stream/Instantâneo) |
| **Sources Panel** | Fontes | Painel com documentos utilizados |

#### Elementos de UI Principais

```html
<!-- Filtro de Categoria -->
<select class="form-select form-select-sm" id="category-select">
    <option value="">Todas as categorias</option>
    <option value="ferias">Férias</option>
    <option value="home_office">Home Office</option>
    <option value="conduta">Conduta</option>
    <option value="geral">Geral</option>
</select>

<!-- Modo de Resposta -->
<div class="btn-group w-100" role="group">
    <button type="button" class="btn btn-sm btn-outline-primary active" id="btn-stream-on">
        <i class="bi bi-arrow-repeat"></i> Streaming
    </button>
    <button type="button" class="btn btn-sm btn-outline-primary" id="btn-stream-off">
        <i class="bi bi-lightning"></i> Instantâneo
    </button>
</div>

<!-- Painel de Fontes -->
<div class="card border-0 shadow-sm mt-4" id="sources-panel" style="display: none;">
    <div class="card-header bg-white">
        <h6 class="fw-bold mb-0">
            <i class="bi bi-book me-2"></i>Fontes Utilizadas
        </h6>
    </div>
    <div class="card-body" id="sources-content">
        <!-- Fontes inseridas via JavaScript -->
    </div>
</div>
```

---

### 4.3 JavaScript do Agente RH (`app/static/js/rag_agent.js`)

**Responsabilidade:** Lógica de interação, comunicação com API e renderização.

#### Funções Principais

| Função | Propósito |
|--------|-----------|
| `formatCodeBlocks()` | Formata blocos de código na resposta |
| `formatLists()` | Formata listas HTML |
| `addMessage()` | Adiciona mensagem ao chat |
| `showSourcesPanel()` | Exibe painel de fontes utilizadas |
| `setStreamMode()` | Alterna entre stream/instantâneo |
| `checkApiStatus()` | Verifica saúde da API |
| `checkRagStatus()` | Verifica status da indexação RAG |
| `sendMessage()` | Envia pergunta para o agente |
| `generateRAGResponse()` | Consulta sem streaming |
| `streamRAGResponse()` | Consulta com streaming (SSE) |
| `clearChat()` | Limpa o chat |

#### Fluxo de Consulta (JavaScript)

```javascript
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
    
    // Decide qual método usar
    if (streamMode) {
        await streamRAGResponse(prompt, categoria, topK);
    } else {
        await generateRAGResponse(prompt, categoria, topK);
    }
}
```

#### Streaming com Server-Sent Events (SSE)

```javascript
async function streamRAGResponse(prompt, categoria, topK) {
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
    
    const reader = r.body.getReader();
    const decoder = new TextDecoder("utf-8");
    
    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        // Processa eventos SSE
        while ((idx = buffer.indexOf("\n")) !== -1) {
            const rawEvent = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 1);
            
            const lines = rawEvent.split("\n");
            for (const line of lines) {
                if (!line.startsWith("data: ")) continue;
                
                const jsonStr = line.slice(6).trim();
                let evt = JSON.parse(jsonStr);
                
                if (evt.type === "token") {
                    fullResponse += evt.content || "";
                    contentEl.innerHTML = formatCodeBlocks(formatLists(fullResponse));
                } else if (evt.type === "sources") {
                    sourcesData = evt.data;
                } else if (evt.type === "done") {
                    if (sourcesData) {
                        showSourcesPanel(sourcesData);
                    }
                }
            }
        }
    }
}
```

---

## 5. Integração com Backend

### 5.1 Autenticação

| Componente | Implementação |
|-----------|---------------|
| **Token Storage** | Session Flask (`session["access_token"]`) |
| **Header** | `Authorization: Bearer <token>` |
| **Validação** | Decorator `require_login()` em todas as rotas protegidas |
| **Expiração** | 1440 minutos (24 horas) configurado no backend |

### 5.2 Proxy Pattern

O frontend atua como **proxy** entre o usuário e a API backend:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │────▶│   Flask     │────▶│   FastAPI   │
│   (JWT)     │     │   (Proxy)   │     │   (RAG)     │
└─────────────┘     └─────────────┘     └─────────────┘
```

**Vantagens:**
- ✅ Token JWT não exposto no browser
- ✅ CORS gerenciado pelo Flask
- ✅ Tratamento de erros centralizado
- ✅ Timeout configurável por rota

### 5.3 Endpoints Consumidos

| Endpoint Backend | Método | Frontend Route | Timeout |
|-----------------|--------|----------------|---------|
| `/auth/register` | POST | `/register` | 10s |
| `/auth/login` | POST | `/login` | 10s |
| `/health` | GET | `/health` | 30s |
| `/models` | GET | `/api/models-count` | 5s |
| `/chats` | GET/POST | `/dashboard`, `/chats/new` | 10s |
| `/chats/{id}/messages` | GET | `/chat/{id}/history` | 15s |
| `/generate` | POST | `/api/generate`, `/api/stream` | 60-300s |
| `/rag/query` | POST | `/api/rag/query` | 120s |
| `/rag/query/stream` | POST | `/api/rag/query/stream` | 300s |
| `/rag/stats` | GET | `/api/rag/status` | 30s |

---

## 6. Segurança

### 6.1 Proteção de Rotas

```python
def require_login():
    if not token():
        return redirect(url_for("login"))
    return None

# Uso em todas as rotas protegidas
@app.get("/rag-agent")
def rag_agent_page():
    red = require_login()
    if red:
        return red
    return render_template("rag_agent.html", email=get_user_email())
```

### 6.2 Gerenciamento de Tokens

| Aspecto | Implementação |
|---------|---------------|
| **Armazenamento** | Session Flask (server-side) |
| **Transmissão** | Header `Authorization: Bearer` |
| **Validação** | Backend valida JWT em cada requisição |
| **Renovação** | Usuário deve fazer login novamente após expiração |

### 6.3 Proteção XSS

```javascript
// Escapar HTML em conteúdo dinâmico
function formatCodeBlocks(text) {
    if (!text) return "";
    return text.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        const escaped = code.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        return `<div class="code-block">...</div>`;
    });
}
```

### 6.4 CORS

Configurado no backend FastAPI:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.ALLOW_ORIGINS],  # "*" em dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 7. Experiência do Usuário (UX)

### 7.1 Fluxo de Navegação

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Login      │────▶│   Dashboard  │────▶│   Agente RH  │
│   Registro   │     │   (Stats)    │     │   (Consulta) │
└──────────────┘     └──────────────┘     └──────────────┘
                              │
                              ▼
                     ┌──────────────┐
                     │   Chat       │
                     │   Histórico  │
                     └──────────────┘
```

### 7.2 Elementos de Feedback

| Elemento | Quando Exibido | Propósito |
|----------|---------------|-----------|
| **Spinner** | Durante consulta | Indica processamento |
| **Status Badge** | Sempre visível | Mostra saúde da API |
| **Toast Messages** | Após ações | Feedback de sucesso/erro |
| **Typing Indicator** | Durante geração | Simula "digitando..." |
| **Sources Panel** | Após resposta | Transparência das fontes |

### 7.3 Acessibilidade

| Recurso | Implementação |
|---------|---------------|
| **Keyboard Navigation** | Enter envia, Shift+Enter quebra linha |
| **ARIA Labels** | Botões com descrições |
| **Focus Management** | Input focado após carregamento |
| **Color Contrast** | Cores com contraste adequado |
| **Responsive Design** | Funciona em mobile e desktop |

---

## 8. Estilização (CSS)

### 8.1 Variáveis CSS (Theme Tokens)

```css
:root {
    --primary-gradient: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    --sidebar-bg: linear-gradient(180deg, #1e3a8a 0%, #0b2f6a 100%);
    --chat-gradient: linear-gradient(135deg, #0b2f6a 0%, #1d4ed8 55%, #1e40af 100%);
    --bg-light: #f8fafc;
    --border-color: #e5e7eb;
    --text-muted: #6b7280;
}
```

### 8.2 Componentes Estilizados

| Componente | Classe CSS | Estilo |
|-----------|-----------|--------|
| **Sidebar** | `.sidebar` | Gradiente azul, fixed, 280px |
| **Message User** | `.user-message` | Gradiente azul, direita |
| **Message Bot** | `.bot-message` | Branco, esquerda |
| **Status Online** | `.status-online` | Verde, badge |
| **Status Offline** | `.status-offline` | Vermelho, badge |
| **Code Block** | `.code-block` | Dark theme, monospace |
| **Typing Dots** | `.typing-dots` | Animação CSS |

### 8.3 Animações

```css
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
}

@keyframes typing {
    0%, 60%, 100% { transform: translateY(0); opacity: 0.75; }
    30% { transform: translateY(-5px); opacity: 1; }
}
```

---

## 9. Configuração e Deploy

### 9.1 Variáveis de Ambiente (`.env`)

```bash
# Flask
FLASK_SECRET_KEY=CHANGE_ME_FRONTEND_SECRET
FLASK_ENV=development
FLASK_DEBUG=True

# Backend API
BACKEND_URL=http://localhost:8000

# Production
# BACKEND_URL=https://api.empresa.com
# FLASK_ENV=production
# FLASK_DEBUG=False
```

### 9.2 Dependências (`requirements.txt`)

```txt
Flask==3.0.0
requests==2.31.0
python-dotenv==1.0.0
Werkzeug==3.0.1
gunicorn==21.2.0  # Production
```

### 9.3 Execução Local

```bash
# 1. Criar ambiente virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate  # Windows

# 2. Instalar dependências
pip install -r requirements.txt

# 3. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env conforme necessário

# 4. Executar aplicação
python app/main.py

# 5. Acessar no browser
http://localhost:5001
```

### 9.4 Deploy em Produção

#### Gunicorn (Linux)

```bash
gunicorn -w 4 -b 0.0.0.0:5001 app.main:app
```

#### Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/

EXPOSE 5001

CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5001", "app.main:app"]
```

#### Docker Compose

```yaml
version: '3.8'

services:
  frontend:
    build: .
    ports:
      - "5001:5001"
    environment:
      - FLASK_SECRET_KEY=${FLASK_SECRET_KEY}
      - BACKEND_URL=http://backend:8000
    depends_on:
      - backend

  backend:
    image: rag-rh-api:latest
    ports:
      - "8000:8000"
    volumes:
      - ./documentos:/app/documentos
      - ./chroma_rh:/app/chroma_rh
```

---

## 10. Performance

### 10.1 Tempos de Resposta Estimados

| Operação | Tempo Médio | Fatores |
|----------|-------------|---------|
| Login/Registro | 1-2 segundos | Rede, validação |
| Carregar Dashboard | 0.5-1 segundo | Query DB, API health |
| Consulta RAG (sem stream) | 15-30 segundos | Reranking, LLM |
| Consulta RAG (com stream) | 15-30 segundos (TTFT: 2-5s) | Same + streaming |
| Carregar Histórico | 1-3 segundos | Quantidade de mensagens |

### 10.2 Otimizações Implementadas

| Técnica | Benefício |
|---------|-----------|
| **Session Flask** | Evita reautenticação constante |
| **Streaming SSE** | Melhor UX (Time to First Token) |
| **Lazy Loading** | Fontes carregadas após resposta |
| **Debounce Input** | Previne envios acidentais |
| **Cache de Status** | Health check a cada 30s |

### 10.3 Otimizações Sugeridas

| Melhoria | Impacto | Complexidade |
|----------|---------|--------------|
| Cache de respostas frequentes | -30% consultas ao backend | Média |
| Lazy loading de histórico | -50% tempo inicial | Baixa |
| WebSocket em vez de SSE | -20% latência | Média |
| CDN para estáticos | -40% load time | Baixa |
| Service Worker (PWA) | Offline support | Alta |

---

## 11. Monitoramento e Logs

### 11.1 Logs do Frontend

```python
# No Flask (app/main.py)
@app.post("/api/rag/query")
def api_rag_query():
    try:
        r = requests.post(...)
        if r.status_code == 200:
            return jsonify(r.json())
        else:
            print(f"Erro backend: HTTP {r.status_code}")  # Log
            ...
    except Exception as e:
        print(f"Erro inesperado: {str(e)}")  # Log
        ...
```

### 11.2 Logs do Browser (JavaScript)

```javascript
async function checkApiStatus() {
    try {
        const r = await fetch("/health");
        const data = await r.json();
        console.log("API Status:", data.status);  // Log
        ...
    } catch (e) {
        console.error("Erro ao verificar API:", e);  // Log erro
        ...
    }
}
```

### 11.3 Métricas Sugeridas

| Métrica | Como Coletar |
|---------|--------------|
| Tempo de resposta médio | JavaScript `performance.now()` |
| Taxa de erro por endpoint | Logs do Flask |
| Usuários ativos | Session count |
| Consultas RAG por dia | Logs do backend |
| Tempo até primeira resposta | JavaScript SSE timing |

---

## 12. Troubleshooting

### 12.1 Erros Comuns e Soluções

| Erro | Causa Provável | Solução |
|------|---------------|---------|
| `401 Unauthorized` | Token expirado ou ausente | Fazer login novamente |
| `503 Service Unavailable` | Backend fora do ar | Verificar `BACKEND_URL` e status do Ollama |
| `Timeout na consulta RAG` | LLM lento ou documentos grandes | Aumentar timeout no proxy |
| `Fontes não aparecem` | Backend não retornou fontes | Verificar `/rag/stats` se há documentos indexados |
| `Streaming não funciona` | Buffer do proxy | Verificar headers `X-Accel-Buffering: no` |
| `CSS não carrega` | Caminho estático incorreto | Verificar `url_for('static', ...)` |

### 12.2 Comandos de Diagnóstico

```bash
# Verificar se Flask está rodando
curl http://localhost:5001/health

# Verificar conexão com backend
curl http://localhost:8000/health

# Verificar se Ollama está respondendo
curl http://localhost:11434/api/tags

# Ver logs do Flask
# (observar output no terminal onde rodou app/main.py)

# Testar rota RAG diretamente
curl -X POST http://localhost:8000/rag/query \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pergunta": "Teste"}'
```

---

## 13. Checklist de Implantação

### 13.1 Pré-Implantação

- [ ] Backend FastAPI rodando em `http://localhost:8000`
- [ ] Ollama rodando com modelos `llama3.2:3b` e `nomic-embed-text`
- [ ] Documentos PDF indexados no ChromaDB
- [ ] Variáveis de ambiente configuradas (`.env`)
- [ ] Dependências instaladas (`pip install -r requirements.txt`)

### 13.2 Testes

- [ ] Login/Registro funcionando
- [ ] Dashboard carrega estatísticas
- [ ] Chat normal envia e recebe mensagens
- [ ] Agente RH responde consultas
- [ ] Streaming funciona (caracteres aparecem progressivamente)
- [ ] Painel de fontes exibe documentos corretamente
- [ ] Logout limpa sessão

### 13.3 Produção

- [ ] `FLASK_DEBUG=False`
- [ ] `FLASK_SECRET_KEY` forte e única
- [ ] `BACKEND_URL` aponta para produção
- [ ] HTTPS configurado (reverse proxy nginx/traefik)
- [ ] Logs centralizados (ELK, CloudWatch, etc.)
- [ ] Monitoramento configurado (Prometheus, New Relic, etc.)

---

## 14. Resumo das Funcionalidades

| Feature | Status | Descrição |
|---------|--------|-----------|
| **Autenticação JWT** | ✅ | Login, registro, logout com sessão Flask |
| **Dashboard** | ✅ | Estatísticas de chats, status API, modelos |
| **Chat Normal** | ✅ | Conversas com LLM genérico (stream/instantâneo) |
| **Histórico de Chat** | ✅ | Visualização completa de mensagens |
| **Agente RH (RAG)** | ✅ | Consultas sobre políticas internas |
| **Filtro por Categoria** | ✅ | Férias, Home Office, Conduta, Geral |
| **Streaming SSE** | ✅ | Respostas em tempo real |
| **Painel de Fontes** | ✅ | Transparência dos documentos utilizados |
| **Status da Indexação** | ✅ | Mostra se documentos estão indexados |
| **Responsive Design** | ✅ | Funciona em mobile e desktop |
| **Acessibilidade** | ✅ | Keyboard nav, ARIA, focus management |

---

## 15. Conclusão

O frontend Flask foi **atualizado com sucesso** para incluir a feature **Agente de RH com RAG**, mantendo todas as funcionalidades existentes e adicionando:

| Benefício | Impacto |
|-----------|---------|
| **Consulta Inteligente** | Usuários podem perguntar sobre políticas de RH em linguagem natural |
| **Transparência** | Painel de fontes mostra de onde vem a informação |
| **Performance** | Streaming melhora percepção de tempo de resposta |
| **Segurança** | JWT + Session Flask protegem dados do usuário |
| **UX Profissional** | Interface moderna com Bootstrap 5 e animações CSS |

### 📊 Métricas de Sucesso

| Métrica | Valor Alvo |
|---------|-----------|
| Tempo de carregamento inicial | < 2 segundos |
| Tempo até primeira resposta (TTFT) | < 5 segundos (streaming) |
| Taxa de sucesso de consultas | > 95% |
| Satisfação do usuário (NPS) | > 70 |

### 🚀 Próximos Passos Sugeridos

1. **Testes E2E**: Implementar Cypress ou Playwright para testes automatizados
2. **PWA**: Adicionar Service Worker para suporte offline
3. **Analytics**: Integrar Google Analytics ou Matomo
4. **Internacionalização**: Suporte a múltiplos idiomas (i18n)
5. **Dark Mode**: Tema escuro opcional

---

**Documento elaborado em:** Janeiro 2025  
**Versão do Frontend:** 1.1.0  
**Versão do Backend:** 1.0.0  
**Responsável:** Equipe de Engenharia de IA
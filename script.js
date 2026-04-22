// Tema claro/oscuro
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar tema desde localStorage
    const savedTheme = localStorage.getItem('http-demo-theme');
    if (savedTheme) {
        document.body.setAttribute('data-theme', savedTheme);
    } else {
        // Detectar preferencia del sistema
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.body.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    }

    // Configurar toggle de tema
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.body.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.body.setAttribute('data-theme', newTheme);
            localStorage.setItem('http-demo-theme', newTheme);
        });
    }

    // Menú hamburguesa responsive
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }

    initHttpSimulator();
});

function initHttpSimulator() {
    const btnGet = document.getElementById('btnGet');
    const btnPost = document.getElementById('btnPost');
    const postBodyContainer = document.getElementById('postBodyContainer');
    const sendBtn = document.getElementById('sendRequestBtn');
    const urlInput = document.getElementById('urlInput');
    const postBodyTextarea = document.getElementById('postBody');
    const responseDisplay = document.getElementById('responseDisplay');
    const loadingSpinner = document.getElementById('loadingSpinner');

    if (!btnGet) return;

    let currentMethod = 'GET';

    btnGet.addEventListener('click', () => {
        currentMethod = 'GET';
        btnGet.classList.add('active-method');
        btnPost.classList.remove('active-method');
        postBodyContainer.style.display = 'none';
    });

    btnPost.addEventListener('click', () => {
        currentMethod = 'POST';
        btnPost.classList.add('active-method');
        btnGet.classList.remove('active-method');
        postBodyContainer.style.display = 'block';
    });

    sendBtn.addEventListener('click', async () => {
        const url = urlInput.value.trim();
        if (!url) {
            showTerminalResponse({
                error: true,
                message: 'Error: URL no válida'
            });
            return;
        }

        loadingSpinner.style.display = 'block';
        sendBtn.disabled = true;

        await new Promise(resolve => setTimeout(resolve, Math.random() * 600 + 300));

        let statusCode = 200;
        let statusMessage = 'OK';
        let responseBody = {};

        if (url.includes('error') || url.includes('404')) {
            statusCode = 404;
            statusMessage = 'Not Found';
            responseBody = { error: 'Resource not found', path: url };
        } else if (url.includes('500') || url.includes('fail')) {
            statusCode = 500;
            statusMessage = 'Internal Server Error';
            responseBody = { error: 'Server error occurred' };
        } else {
            if (currentMethod === 'GET') {
                responseBody = { 
                    data: ['usuario1', 'usuario2', 'usuario3'],
                    total: 3,
                    timestamp: new Date().toISOString()
                };
            } else {
                let bodyData = {};
                try {
                    bodyData = postBodyTextarea.value ? JSON.parse(postBodyTextarea.value) : { message: 'empty body' };
                } catch(e) {
                    bodyData = { raw: postBodyTextarea.value, parse_error: 'Invalid JSON' };
                }
                responseBody = { 
                    received: bodyData, 
                    created: true,
                    id: Math.floor(Math.random() * 10000),
                    timestamp: new Date().toISOString()
                };
            }
        }

        const simulatedHeaders = {
            'Host': new URL(url).hostname || 'api.ejemplo.com',
            'User-Agent': navigator.userAgent,
            'Content-Type': currentMethod === 'POST' ? 'application/json' : 'text/html',
            'Accept': 'application/json'
        };

        const requestInfo = {
            method: currentMethod,
            url: url,
            headers: simulatedHeaders,
            body: currentMethod === 'POST' ? (postBodyTextarea.value || '{}') : null
        };

        const responseInfo = {
            statusCode: statusCode,
            statusMessage: statusMessage,
            headers: {
                'Server': 'HTTPDemo-Server/2.0',
                'Content-Type': 'application/json',
                'Date': new Date().toUTCString(),
                'X-Powered-By': 'HTTP Simulator'
            },
            body: responseBody,
            timeMs: Math.floor(Math.random() * 200 + 50)
        };

        showTerminalResponse(requestInfo, responseInfo);

        loadingSpinner.style.display = 'none';
        sendBtn.disabled = false;
    });

    function syntaxHighlight(json) {
        if (typeof json !== 'string') {
            json = JSON.stringify(json, null, 2);
        }
        return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
            let cls = 'response-number';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'response-key';
                } else {
                    cls = 'response-string';
                }
            } else if (/true|false/.test(match)) {
                cls = 'response-key';
            } else if (/null/.test(match)) {
                cls = 'response-key';
            }
            return `<span class="${cls}">${match}</span>`;
        });
    }

    function showTerminalResponse(request, response) {
        if (response.error) {
            responseDisplay.innerHTML = `
                <div class="response-line">
                    <span class="prompt">$</span> curl -X ${request.method || 'GET'} ${request.url || 'unknown'}
                </div>
                <div class="response-line">
                    <span class="prompt">></span> <span style="color: #ff5f56;">✗ ${response.message}</span>
                </div>
            `;
            return;
        }

        const statusColor = response.statusCode === 200 ? '#27c93f' : (response.statusCode === 404 ? '#ffbd2e' : '#ff5f56');
        const statusIcon = response.statusCode === 200 ? '✓' : (response.statusCode === 404 ? '⚠' : '✗');
        
        const requestBodyStr = request.body ? `\n<span class="prompt">></span> Body: ${request.body.substring(0, 200)}` : '';
        
        const headersStr = Object.entries(request.headers)
            .map(([k, v]) => `\n<span class="prompt">></span>   ${k}: ${v}`)
            .join('');
        
        const responseHeadersStr = Object.entries(response.headers)
            .map(([k, v]) => `\n<span class="prompt">></span>   ${k}: ${v}`)
            .join('');
        
        const highlightedBody = syntaxHighlight(response.body);
        
        const html = `
            <div class="response-line">
                <span class="prompt">$</span> curl -X ${request.method} "${request.url}" \\
                <span class="prompt">></span>   -H "Content-Type: ${request.headers['Content-Type']}" \\
                <span class="prompt">></span>   -H "User-Agent: ${request.headers['User-Agent'].substring(0, 50)}..."
                ${request.method === 'POST' ? '\\\n<span class="prompt">></span>   -d \'{"data": "example"}\'' : ''}
            </div>
            <div class="response-line" style="margin-top: 1rem;">
                <span class="prompt">></span> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            </div>
            <div class="response-line">
                <span class="prompt">></span> <strong style="color: ${statusColor}">${statusIcon} HTTP/${response.statusCode} ${response.statusMessage}</strong>
            </div>
            <div class="response-line">
                <span class="prompt">></span> <strong>Response Headers:</strong>${responseHeadersStr}
            </div>
            <div class="response-line">
                <span class="prompt">></span> <strong>Response Body:</strong>
            </div>
            <div class="response-line" style="margin-left: 1rem;">
                <pre style="margin: 0; font-family: 'Fira Code', monospace; font-size: 0.8rem; color: var(--terminal-text);">${highlightedBody}</pre>
            </div>
            <div class="response-line" style="margin-top: 0.5rem;">
                <span class="prompt">></span> <span style="color: var(--text-muted);">⏱ Tiempo de respuesta: ${response.timeMs} ms</span>
            </div>
            <div class="response-line">
                <span class="prompt">></span> <span style="color: var(--text-muted);">📅 ${new Date().toLocaleString()}</span>
            </div>
        `;
        
        responseDisplay.innerHTML = html;
    }
}
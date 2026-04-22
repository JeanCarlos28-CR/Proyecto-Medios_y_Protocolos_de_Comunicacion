// Tema claro/oscuro
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('http-demo-theme');
    if (savedTheme) {
        document.body.setAttribute('data-theme', savedTheme);
    } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.body.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    }

    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.body.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.body.setAttribute('data-theme', newTheme);
            localStorage.setItem('http-demo-theme', newTheme);
        });
    }

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
            showTerminalResponse({ error: true, message: 'Error: URL no vacia' }, { method: currentMethod, url: '' });
            return;
        }

        loadingSpinner.style.display = 'block';
        sendBtn.disabled = true;
        responseDisplay.innerHTML = `<div class="terminal-placeholder"><span class="prompt">$</span> Conectando a ${new URL(url).hostname}...</div>`;

        const startTime = performance.now();

        try {
            const fetchOptions = {
                method: currentMethod,
                headers: {
                    'User-Agent': navigator.userAgent,
                    'Accept': 'application/json'
                }
            };

            if (currentMethod === 'POST' && postBodyTextarea.value) {
                fetchOptions.headers['Content-Type'] = 'application/json';
                fetchOptions.body = postBodyTextarea.value;
            }

            const response = await fetch(url, fetchOptions);
            const endTime = performance.now();
            const timeMs = Math.round(endTime - startTime);

            const responseBody = await response.text().catch(() => null);
            let parsedBody = responseBody;
            try {
                parsedBody = JSON.parse(responseBody);
            } catch (e) {
                parsedBody = responseBody || '(sin body)';
            }

            const responseHeaders = {};
            response.headers.forEach((value, key) => {
                responseHeaders[key] = value;
            });

            const requestInfo = {
                method: currentMethod,
                url: url,
                headers: fetchOptions.headers,
                body: currentMethod === 'POST' ? postBodyTextarea.value : null
            };

            const responseInfo = {
                statusCode: response.status,
                statusMessage: response.statusText || getStatusMessage(response.status),
                headers: responseHeaders,
                body: parsedBody,
                timeMs: timeMs
            };

            showTerminalResponse(null, requestInfo, responseInfo);

        } catch (error) {
            const endTime = performance.now();
            const timeMs = Math.round(endTime - startTime);

            let statusCode = 0;
            let statusMessage = 'Connection Error';

            if (url.includes('404')) {
                statusCode = 404;
                statusMessage = 'Not Found';
            } else if (url.includes('500')) {
                statusCode = 500;
                statusMessage = 'Internal Server Error';
            }

            const requestInfo = {
                method: currentMethod,
                url: url,
                headers: { 'User-Agent': navigator.userAgent },
                body: currentMethod === 'POST' ? postBodyTextarea.value : null
            };

            const responseInfo = {
                statusCode: statusCode,
                statusMessage: statusMessage,
                headers: { 'Error': error.message },
                body: { error: error.message },
                timeMs: timeMs,
                isError: true
            };

            showTerminalResponse(null, requestInfo, responseInfo);
        }

        loadingSpinner.style.display = 'none';
        sendBtn.disabled = false;
    });

    function getStatusMessage(status) {
        const messages = {
            200: 'OK', 201: 'Created', 204: 'No Content',
            301: 'Moved Permanently', 302: 'Found',
            400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden',
            404: 'Not Found', 405: 'Method Not Allowed',
            500: 'Internal Server Error', 502: 'Bad Gateway', 503: 'Service Unavailable'
        };
        return messages[status] || 'Unknown';
    }

    function syntaxHighlight(json) {
        if (typeof json !== 'string') json = JSON.stringify(json, null, 2);
        return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, match => {
            let cls = 'response-number';
            if (/^"/.test(match)) cls = /:$/.test(match) ? 'response-key' : 'response-string';
            else if (/true|false/.test(match) || /null/.test(match)) cls = 'response-key';
            return `<span class="${cls}">${match}</span>`;
        });
    }

    function showTerminalResponse(error, request, response) {
        if (error) {
            responseDisplay.innerHTML = `
                <div class="response-line">
                    <span class="prompt">$</span> curl -X ${request.method || 'GET'} ${request.url || 'unknown'}
                </div>
                <div class="response-line">
                    <span class="prompt">></span> <span style="color: #ff5f56;">X ${error.message}</span>
                </div>`;
            return;
        }

        const statusColor = response.statusCode === 200 ? '#27c93f' : (response.statusCode === 404 ? '#ffbd2e' : '#ff5f56');
        const statusIcon = response.statusCode === 200 ? 'OK' : (response.statusCode === 404 ? 'NF' : 'ER');

        const statusClass = response.statusCode === 200 ? 'status-ok' : (response.statusCode === 404 ? 'status-404' : (response.statusCode === 0 ? 'status-error' : 'status-error'));

        const headersStr = Object.entries(request.headers)
            .map(([k, v]) => `<span class="prompt">></span>   ${k}: ${v}`)
            .join('<br>');

        const responseHeadersStr = Object.entries(response.headers)
            .map(([k, v]) => `<span class="prompt">></span>   ${k}: ${v}`)
            .join('<br>');

        const bodyDisplay = typeof response.body === 'object'
            ? syntaxHighlight(response.body)
            : response.body;

        const postCmd = request.method === 'POST' && request.body
            ? `<br><span class="prompt">></span>   -d '${request.body.replace(/'/g, "\\'").substring(0, 100)}...'`
            : '';

        const html = `
            <div class="response-line">
                <span class="prompt">$</span> <span style="color: #89ddff;">curl</span> -X ${request.method} "${request.url}" <br>
                <span class="prompt">></span>   -H "User-Agent: ${(request.headers['User-Agent'] || '').substring(0, 40)}..." ${postCmd.replace('<br>', ' ')}
            </div>
            <div class="response-line" style="margin-top: 0.5rem;">
                <span class="prompt">></span> <span style="color: #ff5f56;">━━━</span><span style="color: #ffbd2e;">━</span><span style="color: #27c93f;">━━</span><span style="color: #ffbd2e;">━</span><span style="color: #ff5f56;">━━━━</span>
            </div>
            <div class="response-line">
                <span class="prompt">></span> <strong class="${statusClass}">HTTP/1.1 ${response.statusCode} ${response.statusMessage}</strong>
            </div>
            <div class="response-line">
                <span class="prompt">></span> <strong>Request Headers:</strong><br>${headersStr}
            </div>
            <div class="response-line" style="margin-top: 0.5rem;">
                <span class="prompt">></span> <strong>Response Headers:</strong><br>${responseHeadersStr}
            </div>
            <div class="response-line" style="margin-top: 0.5rem;">
                <span class="prompt">></span> <strong>Response Body:</strong>
            </div>
            <div class="response-line" style="margin-left: 1rem;">
                <pre style="margin: 0; font-family: 'Fira Code', monospace; font-size: 0.75rem; color: var(--terminal-text);">${bodyDisplay}</pre>
            </div>
            <div class="response-line" style="margin-top: 0.5rem;">
                <span class="prompt">></span> <span style="color: var(--text-muted);">⏱ Tiempo: ${response.timeMs} ms</span>
            </div>`;

        responseDisplay.innerHTML = html;
    }
}
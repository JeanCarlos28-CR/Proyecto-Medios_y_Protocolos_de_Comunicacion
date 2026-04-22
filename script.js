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

// Historial de peticiones
const httpHistory = [];
const MAX_HISTORY = 10;

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
        let requestInfo, responseInfo;

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

            requestInfo = {
                method: currentMethod,
                url: url,
                headers: fetchOptions.headers,
                body: currentMethod === 'POST' ? postBodyTextarea.value : null
            };

            responseInfo = {
                statusCode: response.status,
                statusMessage: response.statusText || getStatusMessage(response.status),
                headers: responseHeaders,
                body: parsedBody,
                timeMs: timeMs
            };

            showTerminalResponse(null, requestInfo, responseInfo);
            addToHistory(requestInfo, responseInfo);

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

            requestInfo = {
                method: currentMethod,
                url: url,
                headers: { 'User-Agent': navigator.userAgent },
                body: currentMethod === 'POST' ? postBodyTextarea.value : null
            };

            responseInfo = {
                statusCode: statusCode,
                statusMessage: statusMessage,
                headers: { 'Error': error.message },
                body: { error: error.message },
                timeMs: timeMs,
                isError: true
            };

            showTerminalResponse(null, requestInfo, responseInfo);
            addToHistory(requestInfo, responseInfo);
        }

        loadingSpinner.style.display = 'none';
        sendBtn.disabled = false;
    });

    // Boton exportar PDF
    const exportBtn = document.getElementById('exportPdfBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportToPDF);
    }

    // Boton limpiar historial
    const clearBtn = document.getElementById('clearHistoryBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            httpHistory.length = 0;
            renderHistory();
            renderChart();
        });
    }

    // Render inicial
    renderHistory();
    renderChart();
}

function addToHistory(request, response) {
    const entry = {
        timestamp: new Date().toISOString(),
        method: request.method,
        url: request.url,
        statusCode: response.statusCode,
        statusMessage: response.statusMessage,
        timeMs: response.timeMs,
        isError: response.isError,
        body: response.body
    };

    httpHistory.unshift(entry);
    if (httpHistory.length > MAX_HISTORY) {
        httpHistory.pop();
    }

    renderHistory();
    renderChart();
}

function renderHistory() {
    const historyContainer = document.getElementById('historyContainer');
    if (!historyContainer) return;

    if (httpHistory.length === 0) {
        historyContainer.innerHTML = '<p style="color: var(--text-muted); text-align: center;">Sin peticiones aún</p>';
        return;
    }

    const html = httpHistory.map((entry, index) => {
        const statusColor = entry.statusCode === 200 ? '#27c93f' : '#ff5f56';
        const date = new Date(entry.timestamp).toLocaleTimeString();
        return `
            <div class="history-item" style="padding: 0.5rem; margin-bottom: 0.5rem; background: var(--card-bg); border-radius: 6px; border-left: 3px solid ${statusColor};">
                <div style="display: flex; justify-content: space-between; font-size: 0.75rem;">
                    <span style="color: #89ddff; font-weight: bold;">${entry.method}</span>
                    <span style="color: ${statusColor};">${entry.statusCode} ${entry.statusMessage}</span>
                </div>
                <div style="font-size: 0.7rem; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${entry.url}</div>
                <div style="font-size: 0.7rem; color: var(--text-muted);">
                    <span style="color: #c792ea;">⏱ ${entry.timeMs} ms</span> · <span>${date}</span>
                </div>
            </div>`;
    }).join('');

    historyContainer.innerHTML = html;
}

function renderChart() {
    const canvas = document.getElementById('responseTimeChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Limpiar canvas
    ctx.clearRect(0, 0, width, height);

    // Datos para graficar (ultimos 10 invertidos para orden cronologico)
    const data = [...httpHistory].reverse().slice(0, 10).map(e => e.timeMs);
    const labels = [...httpHistory].reverse().slice(0, 10).map((_, i) => `#${i + 1}`);

    if (data.length === 0) {
        ctx.fillStyle = 'var(--text-muted)';
        ctx.font = '14px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('Sin datos para graficar', width / 2, height / 2);
        return;
    }

    const maxVal = Math.max(...data, 100);
    const barWidth = width / data.length - 4;
    const chartHeight = height - 30;

    // Dibujar barras
    data.forEach((val, i) => {
        const barHeight = (val / maxVal) * chartHeight;
        const x = i * (width / data.length) + 2;
        const y = chartHeight - barHeight + 25;

        // Color segun tiempo
        const color = val < 200 ? '#27c93f' : (val < 500 ? '#ffbd2e' : '#ff5f56');

        ctx.fillStyle = color;
        ctx.fillRect(x, y, barWidth, barHeight);

        // Etiqueta
        ctx.fillStyle = 'var(--text-muted)';
        ctx.font = '10px Fira Code';
        ctx.textAlign = 'center';
        ctx.fillText(val, x + barWidth / 2, height - 2);
    });

    // Linea promedio
    const avg = data.reduce((a, b) => a + b, 0) / data.length;
    const avgY = chartHeight - (avg / maxVal) * chartHeight + 25;

    ctx.strokeStyle = '#c792ea';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, avgY);
    ctx.lineTo(width, avgY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#c792ea';
    ctx.font = '10px Inter';
    ctx.textAlign = 'left';
    ctx.fillText(`Promedio: ${Math.round(avg)}ms`, 5, avgY - 5);
}

async function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#ffffff' : '#000000';
    const bgColor = isDark ? '#1a1a2e' : '#ffffff';

    doc.setFontSize(18);
    doc.setTextColor(textColor);
    doc.text('Informe de Peticiones HTTP', 20, 20);

    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleString()}`, 20, 30);

    // Resumen
    doc.setFontSize(14);
    doc.text('Resumen', 20, 45);

    const totalReq = httpHistory.length;
    const avgTime = totalReq > 0 ? Math.round(httpHistory.reduce((a, b) => a + b.timeMs, 0) / totalReq) : 0;
    const successRate = totalReq > 0 ? Math.round((httpHistory.filter(e => e.statusCode === 200).length / totalReq) * 100) : 0;

    doc.setFontSize(10);
    doc.text(`Total peticiones: ${totalReq}`, 20, 55);
    doc.text(`Tiempo promedio: ${avgTime} ms`, 20, 62);
    doc.text(`Tasa de exito: ${successRate}%`, 20, 69);

    // Historial
    doc.setFontSize(14);
    doc.text('Historial de Peticiones', 20, 85);

    let y = 95;
    httpHistory.forEach((entry, i) => {
        if (y > 270) {
            doc.addPage();
            y = 20;
        }

        const status = entry.statusCode === 200 ? 'OK' : 'ERROR';
        doc.setFontSize(9);
        doc.text(`${i + 1}. ${entry.method} ${entry.url}`, 20, y);
        doc.text(`Status: ${entry.statusCode} ${entry.statusMessage} | Tiempo: ${entry.timeMs}ms | ${status}`, 20, y + 5);
        y += 12;
    });

    // Grafico
    if (httpHistory.length > 0) {
        doc.addPage();
        doc.setFontSize(14);
        doc.text('Grafico de Tiempos de Respuesta', 20, 20);

        const canvas = document.getElementById('responseTimeChart');
        if (canvas) {
            const imgData = canvas.toDataURL('image/png');
            doc.addImage(imgData, 'PNG', 20, 30, 170, 60);
        }
    }

    doc.save('http-report.pdf');
}